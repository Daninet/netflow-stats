export function nf5Decode(msg: Buffer) {
  const version = msg.readUInt16BE(0);
  if (version !== 5) {
    console.warn(`Unsupported netflow version: ${version}`);
    return null;
  }

  const count = msg.readUInt16BE(2);
  if (msg.length !== count * 48 + 24) {
    console.warn(`Invalid count: ${count}`);
    return null;
  }

  // const uptime = msg.readUInt32BE(4);
  // const seconds = msg.readUInt32BE(8);
  // const nseconds = msg.readUInt32BE(12);
  const sequence = msg.readUInt32BE(16);
  // const engine_type = msg.readUInt8(20);
  // const engine_id = msg.readUInt8(21);
  // const sampling_interval = msg.readUInt16BE(22);

  let index = 24;

  const flows = [];
  while (index < msg.length) {
    flows.push({
      ipv4_src_addr: msg.readUInt32BE(index + 0),
      ipv4_dst_addr: msg.readUInt32BE(index + 4),
      // ipv4_next_hop: msg.readUInt32BE(index + 8),
      // input_snmp: msg.readUInt16BE(index + 12),
      // output_snmp: msg.readUInt16BE(index + 14),
      pkts: msg.readUInt32BE(index + 16),
      bytes: msg.readUInt32BE(index + 20),
      // first_switched: msg.readUInt32BE(index + 24),
      // last_switched: msg.readUInt32BE(index + 28),
      ipv4_src_port: msg.readUInt16BE(index + 32),
      ipv4_dst_port: msg.readUInt16BE(index + 34),
      // tcp_flags: msg.readUInt8(index + 37),
      // protocol: msg.readUInt8(index + 38),
      // src_tos: msg.readUInt8(index + 39),
      // in_as: msg.readUInt16BE(index + 40),
      // out_as: msg.readUInt16BE(index + 42),
      // src_mask: msg.readUInt8(index + 44),
      // dst_mask: msg.readUInt8(index + 45),
    });
    index += 48;
  }

  // console.log({ flows });
  return { sequence, flows };
}

export type DecodedFlow = NonNullable<
  ReturnType<typeof nf5Decode>
>["flows"][number];
