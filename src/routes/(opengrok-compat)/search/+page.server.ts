import * as v from "@badrap/valita";
import fs from "node:fs";
import { toZoekt, type OpenGrokSearchParams } from "./opengrok-lucene.server";
import { redirect } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = ({ url }) => {
  const extract = (name: string) => url.searchParams.get(name) ?? undefined;
  const params: OpenGrokSearchParams = {
    full: extract("full"),
    defs: extract("defs"),
    refs: extract("refs"),
    path: extract("path"),
    hist: extract("hist"),
    type: extract("type"),
    sort: extract("sort"),
    project: extract("project"),
    searchall: extract("searchall") === "true",
  };

  const { zoektQuery } = toZoekt(params, {
    projectToRepo,
  });

  // TODO either render an explanatory page or redirect, based on a cookie that
  // is configurable on the page.

  throw redirect(
    301,
    zoektQuery ? `/?${new URLSearchParams({ q: zoektQuery }).toString()}` : "/"
  );
};

/**
 * Users may provide a simple JSON file that maps from OpenGrok project names to
 * Zoekt repo names, in case project names changed.
 */
const projectToRepo = await (async function () {
  if (process.env.OPENGROK_PROJECT_MAPPINGS_FILE) {
    const projectMappingSchema = v.record(v.string());
    const raw = JSON.parse(
      await fs.promises.readFile(
        process.env.OPENGROK_PROJECT_MAPPINGS_FILE,
        "utf8"
      )
    );
    return new Map(Object.entries(projectMappingSchema.parse(raw)));
  } else {
    return new Map();
  }
})();
