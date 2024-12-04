import fs from "node:fs";
import * as mmdb from "mmdb-lib";
import { LRUCache } from "lru-cache";
import dns from "node:dns";

const mmdbCache = new LRUCache<string, ReturnType<typeof lookupMMDB>>({
  ttl: 1000 * 60 * 30, // 30 minutes,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  ttlAutopurge: true,
  ttlResolution: 10000,
});

const reverseDNSCache = new LRUCache<string, string>({
  ttl: 1000 * 60 * 30, // 30 minutes,
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  ttlAutopurge: true,
  ttlResolution: 10000,
});

const resolveDNSQueue: string[] = [];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveDNS(ipStr: string) {
  if (reverseDNSCache.has(ipStr)) return;
  try {
    const reversed = await dns.promises.reverse(ipStr);
    if (reversed.length > 0) {
      reverseDNSCache.set(ipStr, reversed[0]);
    }
  } catch (e) {
    reverseDNSCache.set(ipStr, "", { ttl: 1000 * 60 * 15 });
  }
}

async function resolveDNSWorker() {
  for (let i = 0; i < Math.min(resolveDNSQueue.length, 100); i++) {
    const ipStr = resolveDNSQueue.shift();
    if (!ipStr) break;
    await resolveDNS(ipStr);
    await sleep(100);
  }
  setTimeout(() => resolveDNSWorker(), 1000);
}

resolveDNSWorker();

let mmdbReader: null | mmdb.Reader<mmdb.Response> = null;
let unloadDbTimer: NodeJS.Timeout | null = null;

function lookupMMDB(ipStr: string) {
  if (unloadDbTimer) {
    clearTimeout(unloadDbTimer);
  }

  if (mmdbReader === null) {
    const db = fs.readFileSync("./data/db.mmdb"); // from https://ipinfo.io/
    mmdbReader = new mmdb.Reader(db);
  }

  const mmdbRes = mmdbReader.get(ipStr) as any;

  const formattedMMDBRes: {
    country: string | null;
    asn: string | null;
    name: string | null;
    domain: string | null;
  } = {
    country: mmdbRes?.country ?? null,
    asn: mmdbRes?.asn ?? null,
    name: mmdbRes?.as_name ?? null,
    domain: mmdbRes?.as_domain ?? null,
  };

  unloadDbTimer = setTimeout(() => {
    mmdbReader = null;
  }, 5000);

  return formattedMMDBRes;
}

export const queueDnsQuery = (ipStr: string) => {
  const hostname = reverseDNSCache.get(ipStr);
  if (!hostname && !resolveDNSQueue.includes(ipStr)) {
    resolveDNSQueue.push(ipStr);
  }
};

export const resolve = (ipStr: string) => {
  const hostname = reverseDNSCache.get(ipStr);
  if (!hostname) {
    queueDnsQuery(ipStr);
  }

  let mmdbRes = mmdbCache.get(ipStr);
  if (!mmdbRes) {
    mmdbRes = lookupMMDB(ipStr);
    mmdbCache.set(ipStr, mmdbRes);
  }

  return { hostname, ...mmdbRes };
};
