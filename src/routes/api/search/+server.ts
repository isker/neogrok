import {
  searchQuerySchema,
  type SearchQuery,
  search,
} from "$lib/server/search-api";
import type { RequestHandler } from "@sveltejs/kit";

// This exists as a workaround to poor `devalue` performance. When using a
// +page.server.ts `load` function, you have no choice but for your response to
// be serialized in the server and deserialized on the client using `devalue`.
// And it has pretty poor performance compared to JSON.stringify/JSON.parse. So,
// we abandon `+page.server.ts` in favor of this API endpoint, which lets us use
// native JSON. The difference in performance is quite clear.
export const POST = (async ({ request, fetch }) => {
  let searchQuery: SearchQuery;
  try {
    const body = await request.json();
    searchQuery = searchQuerySchema.parse(body, { mode: "strip" });
  } catch (e) {
    return new Response(JSON.stringify({ kind: "error", error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const searchResponse = await search(searchQuery, fetch);
    return new Response(JSON.stringify(searchResponse), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        kind: "error",
        error: `zoekt call failed: ${String(e)}`,
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}) satisfies RequestHandler;
