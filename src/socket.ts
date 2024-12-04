import udp from "dgram";

export const startUdpSocket = (callback: (msg: Buffer) => void) => {
  const server = udp.createSocket("udp4");

  server.on("error", (error) => {
    console.log(`Error: ${error}`);
    server.close();
  });

  server.on("message", (msg, info) => {
    callback(msg);
  });

  server.on("listening", () => {
    const address = server.address();
    const port = address.port;
    const family = address.family;
    const ipaddr = address.address;
    console.log(`Server is listening at port${port}`);
    console.log(`Server ip:${ipaddr}`);
    console.log(`Server is IP4/IP6 : ${family}`);
  });

  server.on("close", () => {
    console.log("Socket is closed!");
    process.exit(-1);
  });

  server.bind(2055);
};
