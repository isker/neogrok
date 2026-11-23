import { stylesheet } from "#lib/server/syntax-highlighting.js";

// Styles the syntax highlighting tokens that the search API emits.
export const prerender = true;

export const GET: import("./$types").RequestHandler = () =>
  new Response(stylesheet, { headers: { "content-type": "text/css" } });
