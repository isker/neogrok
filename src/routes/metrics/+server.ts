import { dev } from "$app/environment";
import { error, type RequestHandler } from "@sveltejs/kit";
import { registry } from "$lib/server/metrics";

export const GET = (async () => {
  if (!dev) {
    // This endpoint is only enabled in dev (i.e. SvelteKit vite dev server), as
    // prom metrics are only served on the same port as the application in dev.
    // In prod, prom metrics are exposed on a different port on an opt-in basis;
    // this is the most generally-useful and not-harmful approach, as you don't
    // want to expose /metrics to end users in prod.
    throw error(404, "Not found");
  }
  return new Response(await registry.metrics(), {
    headers: { "content-type": registry.contentType },
  });
}) satisfies RequestHandler;
