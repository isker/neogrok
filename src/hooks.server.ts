import { building } from "$app/environment";
import { resolveConfiguration } from "$lib/server/configuration";

if (!building) {
  // Resolve the configuration on startup, such that startup fails if the
  // configuration is invalid.
  //
  // We don't actually use any of the features of this hooks module, other than
  // that it is evaluated on startup; other modules are not.
  await resolveConfiguration();
}

// TODO we should have prom metrics, on, among other things, HTTP requests
// handled, and the `handle` hook would be a good way to do that.

// TODO SvelteKit logs an error every time anything requests a URL that does not
// map to a route. Bonkers. Silence those by implementing `handleError`.
