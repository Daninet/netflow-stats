#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import Fastify, { FastifyRequest } from "fastify";
import path, { dirname } from "node:path";
import fastifyStatic from "@fastify/static";
import { render } from "preact-render-to-string";
import { wrapIntoHtml } from "./views/html.js";
import { startUdpSocket } from "./socket.js";
import { Store } from "./store.js";
import { ServerContext } from "./types.js";
import { renderRoute } from "./routes.js";

export async function main() {
  const server = Fastify({ logger: true });

  const __dirname = dirname(__filename);

  const store = new Store();

  startUdpSocket((msg) => {
    store.recv(msg);
  });

  const makeCtx = (req: FastifyRequest): ServerContext => {
    return {
      url: req.url,
      store,
    };
  };

  server.register(async (server) => {
    server.get("/*", async (req, reply) => {
      const ctx = makeCtx(req);
      const routeRes = await renderRoute(ctx);
      const icon = wrapIntoHtml(routeRes ? render(routeRes) : "");
      reply.type("text/html");
      reply.send(icon);
    });

    server.register(fastifyStatic, {
      root: path.join(__dirname, "public"),
      prefix: "/public",
    });
  });

  return server;
}

main().then(async (server) => {
  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
});
