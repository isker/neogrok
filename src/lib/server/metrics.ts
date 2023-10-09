import { dev } from "$app/environment";
import {
  Counter,
  Gauge,
  collectDefaultMetrics,
  Registry,
  register,
} from "prom-client";

// The global registry persists across HMR reloads of this module, throwing on
// every reload due to duplicate names. So, in dev, use a registry scoped to
// this module. In prod, we can't do that as the entrypoint to the application,
// which mounts the prom /metrics server there, can't import from sveltekit
// application chunks. Thankfully, there is no HMR in prod, so we can just use
// the global registry in that case.
export const registry = dev ? new Registry() : register;

collectDefaultMetrics({ register: registry });
export const zoektRequestCount = new Counter({
  name: "zoekt_http_requests_total",
  help: "Count of http requests made to zoekt",
  labelNames: ["path", "status"],
  registers: [registry],
});
export const zoektRequestDuration = new Counter({
  name: "zoekt_http_request_seconds_total",
  help: "Duration of http requests made to zoekt",
  labelNames: ["path", "status"],
  registers: [registry],
});
export const zoektRequestConcurrency = new Gauge({
  name: "zoekt_http_requests",
  help: "Gauge of concurrent requests being made to zoekt",
  labelNames: ["path"],
  registers: [registry],
});

export const neogrokRequestCount = new Counter({
  name: "neogrok_http_requests_total",
  help: "Count of http requests handled by neogrok",
  labelNames: ["route", "status"],
  registers: [registry],
});
export const neogrokRequestDuration = new Counter({
  name: "neogrok_http_request_seconds_total",
  help: "Duration of http requests handled by neogrok",
  labelNames: ["route", "status"],
  registers: [registry],
});
export const neogrokRequestConcurrency = new Gauge({
  name: "neogrok_http_requests",
  help: "Gauge of concurrent requests being handled by neogrok",
  labelNames: ["route"],
  registers: [registry],
});
