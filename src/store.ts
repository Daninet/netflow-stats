import { queueDnsQuery, resolve } from "./resolver.js";
import { DecodedFlow, nf5Decode } from "./nf5.js";
import { memoryUsage, uptime } from "process";

const MAX_STORAGE_MS = 1000 * 60 * 60 * 24;

export type StatRecord = {
  inBytes: number;
  inPkts: number;
  outBytes: number;
  outPkts: number;
  ports: Set<number>;
  lastSeenAt: number;
};

export class Store {
  statistics = {
    errors: 0,
    missedUDP: 0,
    recordsHandled: 0,
    flowsHandled: 0,
    totalPackets: 0,
    totalBytes: 0,
  };

  private sources = new Map<number, Map<number, StatRecord>>();
  private bandwidth = new Map<
    number,
    Pick<StatRecord, "inBytes" | "inPkts" | "outBytes" | "outPkts">
  >();

  isTempPort(port: number) {
    return port >= 49152;
  }

  isLocal(intIp: number) {
    // 10.0.0.0/8: Private network
    if (intIp >>> 24 === 10) {
      return true;
    }

    // 172.16.0.0/12: Private network
    if (intIp >>> 20 === 1728) {
      // 172 << 4 == 1728
      return true;
    }

    // 192.168.0.0/16: Private network
    if (intIp >>> 16 === 49320) {
      // 192 << 8 + 168 == 49320
      return true;
    }

    // 127.0.0.0/8: Loopback
    if (intIp >>> 24 === 127) {
      return true;
    }

    // 169.254.0.0/16: Link-local
    if (intIp >>> 16 === 43200) {
      // 169 << 8 + 254 == 43200
      return true;
    }

    // 224.0.0.0/4: Multicast (Local segment multicast is part of this range)
    if (intIp >>> 28 === 14) {
      // 224 >> 4 == 14
      return true;
    }

    // 255.255.255.255: Broadcast
    if (intIp === 0xffffffff) {
      return true;
    }

    // 0.0.0.0/8: Current network (default route)
    if (intIp >>> 24 === 0) {
      return true;
    }

    return false;
  }

  intToIpv4(intIp: number) {
    return [
      (intIp >>> 24) & 0xff,
      (intIp >>> 16) & 0xff,
      (intIp >>> 8) & 0xff,
      intIp & 0xff,
    ].join(".");
  }

  // ordered by sequence number
  private recordQueue: {
    recvAt: number;
    sequence: number;
    flows: DecodedFlow[];
  }[] = [];

  private decodeTimer: NodeJS.Timeout | null = null;

  recv(msg: Buffer) {
    const decodeRes = nf5Decode(msg);
    if (decodeRes === null) {
      this.statistics.errors++;
      return;
    }

    const { sequence, flows } = decodeRes;

    this.statistics.totalPackets += 1;

    const insertObj = { recvAt: Date.now(), sequence, flows };

    const queueIndex = this.recordQueue.findIndex(
      (q) => q.sequence >= sequence
    );
    if (queueIndex === -1) {
      this.recordQueue.push(insertObj);
    } else if (this.recordQueue[queueIndex].sequence === sequence) {
      this.statistics.errors++;
      return;
    } else {
      this.recordQueue.splice(queueIndex, 0, insertObj);
    }

    if (this.decodeTimer === null) {
      this.decodeTimer = setTimeout(() => {
        this.decodeTimer = null;
        this.decodeRecords();
      }, 600);
    }
  }

  lastCleanupAt = Date.now();

  lastSequence: number | null = null;

  decodeRecords() {
    const cutoffTime = Date.now() - 250;
    const processingRecords = [];
    const rest = [];
    for (const p of this.recordQueue) {
      if (p.recvAt <= cutoffTime) {
        processingRecords.push(p);
      } else {
        rest.push(p);
      }
    }

    this.recordQueue = rest;

    if (this.lastSequence === null && processingRecords.length > 0) {
      this.lastSequence = processingRecords[0].sequence;
    }

    for (const { sequence, flows } of processingRecords) {
      if (sequence !== this.lastSequence) {
        this.statistics.errors++;
        this.statistics.missedUDP++;
      }
      this.decodeFlow(flows);
      this.lastSequence = sequence + flows.length;
    }

    this.statistics.recordsHandled += processingRecords.length;

    if (Date.now() - this.lastCleanupAt > 1000 * 60 * 30) {
      this.lastCleanupAt = Date.now();
      setTimeout(() => this.cleanup(), 100);
    }
  }

  decodeFlow(flows: DecodedFlow[]) {
    for (const flow of flows) {
      queueDnsQuery(this.intToIpv4(flow.ipv4_src_addr));
      queueDnsQuery(this.intToIpv4(flow.ipv4_dst_addr));

      const isSrcLocal = this.isLocal(flow.ipv4_src_addr);
      const isDstLocal = this.isLocal(flow.ipv4_dst_addr);

      if (!isSrcLocal && !isDstLocal) {
        continue;
      }

      const localAddr = isSrcLocal ? flow.ipv4_src_addr : flow.ipv4_dst_addr;
      let source = this.sources.get(localAddr);
      if (!source) {
        source = new Map();
        this.sources.set(localAddr, source);
      }

      const dstKey = isSrcLocal ? flow.ipv4_dst_addr : flow.ipv4_src_addr;
      let stats = source.get(dstKey);
      if (!stats) {
        stats = {
          inBytes: 0,
          inPkts: 0,
          outBytes: 0,
          outPkts: 0,
          ports: new Set(),
          lastSeenAt: 0,
        } as StatRecord;
        source.set(dstKey, stats);
      }

      let bandwidth = this.bandwidth.get(localAddr);
      if (!bandwidth) {
        bandwidth = {
          inBytes: 0,
          inPkts: 0,
          outBytes: 0,
          outPkts: 0,
        } as StatRecord;
        this.bandwidth.set(localAddr, bandwidth);
      }

      if (isSrcLocal) {
        stats.outBytes += flow.bytes;
        stats.outPkts += flow.pkts;
        bandwidth.outBytes += flow.bytes;
        bandwidth.outPkts += flow.pkts;
      } else {
        stats.inBytes += flow.bytes;
        stats.inPkts += flow.pkts;
        bandwidth.inBytes += flow.bytes;
        bandwidth.inPkts += flow.pkts;
      }

      if (!this.isTempPort(flow.ipv4_dst_port)) {
        stats.ports.add(flow.ipv4_dst_port);
      } else if (!this.isTempPort(flow.ipv4_src_port)) {
        stats.ports.add(flow.ipv4_src_port);
      }

      stats.lastSeenAt = Math.floor(Date.now());

      this.statistics.totalBytes += flow.bytes;
      this.statistics.totalPackets += flow.pkts;
    }

    this.statistics.flowsHandled += flows.length;
  }

  formatConn(value: Map<number, StatRecord>) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, value]) => [
        this.intToIpv4(key),
        {
          ...value,
          ports: Array.from(value.ports),
        },
      ])
    );
  }

  cleanup() {
    console.log("Cleaning up old connections...");
    for (const [srcIp, dstMap] of this.sources) {
      const newDst = new Map(
        Array.from(dstMap.entries()).filter(
          ([dstIp, stats]) => stats.lastSeenAt > Date.now() - MAX_STORAGE_MS
        )
      );

      this.sources.set(srcIp, newDst);
    }

    this.sources = new Map(
      Array.from(this.sources.entries()).filter(
        ([srcIp, dstMap]) => dstMap.size > 0
      )
    );
  }

  getStatistics() {
    return {
      ...this.statistics,
      memoryUsage: memoryUsage().rss,
      totalConnectionsStored: Array.from(this.sources.values()).reduce(
        (accSrc, dstMap) => accSrc + dstMap.size,
        0
      ),
      uptime: uptime(),
    };
  }

  getSources() {
    return Array.from(this.sources.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([srcIp, dstValues]) => ({
        srcIp: this.intToIpv4(srcIp),
        dst: Array.from(dstValues.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([dstIp, value]) => ({
            dstIp: this.intToIpv4(dstIp),
            ...value,
          })),
      }));
  }

  getSourceBandwidth() {
    return Array.from(this.bandwidth.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([srcIp, dstValue]) => ({
        srcIp: this.intToIpv4(srcIp),
        inBytes: dstValue.inBytes,
        inPkts: dstValue.inPkts,
        outBytes: dstValue.outBytes,
        outPkts: dstValue.outPkts,
      }));
  }
}
