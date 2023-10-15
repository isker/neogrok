#!/usr/bin/env node

// This is the main "production" entrypoint into neogrok. It wraps the SvelteKit
// server to do some additional things. Note that the vite dev server used by
// SvelteKit bypasses this module entirely, as it's a fundamentally different
// entrypoint.
//
// See https://kit.svelte.dev/docs/adapter-node#custom-server for details.

import { createServer } from "node:http";
import { register } from "prom-client";
import { handler } from "./build/handler.js";
import { env } from "./build/env.js";

// These are copied straight out of the default SvelteKit entrypoint.
const path = env("SOCKET_PATH", false);
const host = env("HOST", "0.0.0.0");
const port = env("PORT", !path && "3000");

const abortController = new AbortController();
// The default SvelteKit node server does not handle standard "well-behaved http
// server signals".
process.once("SIGTERM", () => {
  console.log(
    "Received SIGTERM, draining connections in an attempt to gracefully shut down...",
  );
  abortController.abort();
});
process.once("SIGINT", () => {
  console.log(
    "Received SIGINT, draining connections in an attempt to gracefully shut down...",
  );
  abortController.abort();
});

// @ts-expect-error the polka handler has an additional `next` property that is
// not actually used by the implementation.
const server = createServer(handler);
server.listen({ host, port, path, signal: abortController.signal }, () => {
  console.log(`Listening on ${path ? path : host + ":" + port}`);
});

// Support binding a prometheus /metrics server on a different port/path, so
// that it is not exposed on the site.
const promPath = env("PROMETHEUS_SOCKET_PATH", false);
const promHost = env("PROMETHEUS_HOST", "0.0.0.0");
const promPort = env("PROMETHEUS_PORT", false);
if (promPort && promPort === port) {
  throw new Error(
    `PROMETHEUS_PORT ${promPort} cannot be the same as PORT ${port}`,
  );
}
if (promPath && promPath === path) {
  throw new Error(
    `PROMETHEUS_SOCKET_PATH ${promPath} cannot be the same as SOCKET_PATH ${path}`,
  );
}
if (promPort || promPath) {
  const promServer = createServer((req, res) => {
    if (req.method === "GET" && req.url?.endsWith("/metrics")) {
      res.statusCode = 200;
      res.setHeader("content-type", register.contentType);
      register.metrics().then(
        (body) => res.end(body),
        (err) => {
          console.error("failed to generate prometheus /metrics response", err);
          res.writeHead(500, "Internal Server Error");
          res.end();
        },
      );
    } else {
      res.writeHead(404, "Not found");
      res.end("Not found");
    }
  });
  promServer.listen(
    {
      host: promHost,
      port: promPort,
      path: promPath,
      signal: abortController.signal,
    },
    () => {
      console.log(
        `Prometheus listening on ${
          promPath ? promPath : promHost + ":" + promPort
        }`,
      );
    },
  );
}
