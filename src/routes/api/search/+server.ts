import { ZOEKT_URL } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";

// This exists as a workaround to poor `devalue` performance. When using a
// +page.server.ts `load` function, you have no choice but for your response to
// be serialized in the server and deserialized on the client using `devalue`.
// And it really struggles with large JSON-serializable responses. So, we
// abandon `+page.server.ts` in favor of this pass-through API endpoint, which
// lets us use native JSON. The difference in performance is quite clear.
//
// The cost is that the browser needs to download and run more code than it
// would with a `+page.server.ts`; there is no more materially server-only code.
// However, increased code size is trivially dwarfed by the size of API
// responses upon navigation, regardless of whether we're using native JSON or
// devalue.
//
// Perhaps in a future where we massage zoekt responses to fit within a certain
// upper bound on size, we can revisit this hack, to keep more code out of
// browsers.
export const POST = (async ({ request }) => {
  // It's hard to use ReadableStreams as request bodies, just buffer it in.
  // The request size is quite small anyway, typically less than 1kb.
  const body = await request.arrayBuffer();
  return fetch(new URL("/api/search", ZOEKT_URL), {
    body,
    method: "POST",
    headers: { "content-type": "application/json" },
  });
}) satisfies RequestHandler;
