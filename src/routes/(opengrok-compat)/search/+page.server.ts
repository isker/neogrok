import {
  toZoekt,
  type OpenGrokSearchParams,
  renderRepoQuery,
} from "./opengrok-lucene.server";
import { redirect } from "@sveltejs/kit";
import { listRepositories } from "$lib/server/zoekt-list-repositories";
import { projectToRepo } from "$lib/server/opengrok-compat";

export const load: import("./$types").PageServerLoad = async ({
  url,
  parent,
  setHeaders,
  fetch,
}) => {
  const extract = (name: string) =>
    // OpenGrok typically generates URLs with query parameter keys present and
    // values empty, so we really do want || not ??.
    url.searchParams.get(name) || undefined;
  const params: OpenGrokSearchParams = {
    full: extract("full"),
    defs: extract("defs"),
    refs: extract("refs"),
    path: extract("path"),
    hist: extract("hist"),
    type: extract("type"),
    sort: extract("sort"),
    project: extract("project"),
    searchall: extract("searchall") === "true" || undefined,
    start: Number.parseInt(extract("start") ?? "", 10) || undefined,
  };

  const queryUnknownRepos = async (candidates: Set<string>) => {
    const reposQuery = renderRepoQuery(Array.from(candidates));

    const repositories = await listRepositories({ query: reposQuery }, fetch);

    if (repositories.kind === "error") {
      throw new Error(repositories.error);
    }

    const present = new Set(
      repositories.results.repositories.map(({ name }) => name)
    );
    return new Set(Array.from(candidates).filter((c) => !present.has(c)));
  };

  const { luceneQuery, zoektQuery, warnings } = await toZoekt(params, {
    projectToRepo,
    queryUnknownRepos,
  });

  setHeaders({
    "cache-control": "no-store,must-revalidate",
  });

  const { preferences } = await parent();
  if (preferences.openGrokInstantRedirect && zoektQuery) {
    throw redirect(
      301,
      `/?${new URLSearchParams({ q: zoektQuery }).toString()}`
    );
  }

  return {
    params,
    luceneQuery,
    zoektQuery,
    warnings,
  };
};
