import { building } from "$app/environment";
import { resolveConfiguration } from "$lib/server/configuration";
import type { HandleServerError } from "@sveltejs/kit";

if (!building) {
  // Resolve the configuration on startup, such that startup fails if the
  // configuration is invalid. We do this here because this hooks module runs on
  // service startup, but not the build, unlike the configuration module.
  await resolveConfiguration();
}

// TODO we should have prom metrics, on, among other things, HTTP requests
// handled, and the `handle` hook would be a good way to do that.

// SvelteKit logs an error every time anything requests a URL that does not map
// to a route. Bonkers. Override the default behavior to exclude such cases.
export const handleError: HandleServerError = ({ error, event }) => {
  if (event.route.id !== null) {
    console.error(error);
  }
};
