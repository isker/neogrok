import { building } from "$app/environment";
import { resolveConfiguration } from "$lib/server/configuration";
import {
  neogrokRequestCount,
  neogrokRequestDuration,
  neogrokRequestConcurrency,
} from "$lib/server/metrics";
import type { Handle, HandleServerError } from "@sveltejs/kit";

if (!building) {
  // This seems to be the magic way to do truly one-time setup in both dev and
  // prod.

  // Resolve the configuration on startup, such that startup fails if the
  // configuration is invalid. We do this here because this hooks module runs on
  // service startup, but not during the build, which is the case in most any
  // other module.
  await resolveConfiguration();
}

// Handle request metrics on all SvelteKit requests.
export const handle: Handle = async ({ event, resolve }) => {
  const routeLabel = event.route.id ?? "null";
  try {
    neogrokRequestConcurrency.labels(routeLabel).inc();

    const start = Date.now();
    const response = await resolve(event);
    const durationSeconds = (Date.now() - start) / 1000;

    const labels = [routeLabel, response.status.toString()];
    neogrokRequestCount.labels(...labels).inc();
    neogrokRequestDuration.labels(...labels).inc(durationSeconds);

    return response;
  } finally {
    neogrokRequestConcurrency.labels(routeLabel).dec();
  }
};

// SvelteKit logs an error every time anything requests a URL that does not map
// to a route. Bonkers. Override the default behavior to exclude such cases.
export const handleError: HandleServerError = ({ error, event }) => {
  if (event.route.id !== null) {
    console.error(error);
  }
};
