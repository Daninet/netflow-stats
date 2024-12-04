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
    console.log(`Server is listening at UDP port ${address.port}`);
  });

  server.on("close", () => {
    console.log("Socket is closed!");
    process.exit(-1);
  });

  server.bind(2055);
};
