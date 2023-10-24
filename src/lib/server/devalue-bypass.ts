import type { RequestHandler } from "@sveltejs/kit";
import type { Type } from "@badrap/valita";

// This exists as a workaround to poor `devalue` performance. When using a
// +page.server.ts `load` function, you have no choice but for your response to
// be serialized in the server and deserialized on the client using `devalue`.
// And it has pretty poor performance compared to JSON.stringify/JSON.parse. So,
// we abandon `+page.server.ts` in favor of API endpoints implemented using
// this, which lets us use native JSON. The difference in performance is quite
// clear.
export const devalueBypass =
  <RequestData, ResponseData>(
    schema: Type<RequestData>,
    callZoekt: (
      requestData: RequestData,
      f: typeof fetch,
    ) => Promise<ResponseData>,
  ): RequestHandler =>
  async ({ request, fetch }) => {
    let requestData: RequestData;
    try {
      const body = await request.json();
      requestData = schema.parse(body, { mode: "strip" });
    } catch (e) {
      return new Response(JSON.stringify({ kind: "error", error: String(e) }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const responseData = await callZoekt(requestData, fetch);
      return new Response(JSON.stringify(responseData), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      console.error("zoekt call failed:", e);
      return new Response(
        JSON.stringify({
          kind: "error",
          error: `zoekt call failed: ${String(e)}`,
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  };
