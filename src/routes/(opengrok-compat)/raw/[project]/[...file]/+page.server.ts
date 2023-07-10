import { escapeRegExp } from "$lib/regexp";
import { projectToRepo } from "$lib/server/opengrok-compat";
import { listRepositories } from "$lib/server/zoekt-list-repositories";
import { error, redirect } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = async ({
  url,
  params: { file, project },
  parent,
  setHeaders,
  fetch,
}) => {
  if (!file) {
    throw error(404);
  }
  const revision = url.searchParams.get("r");
  const convertedRepo = projectToRepo.get(project);

  const result = await listRepositories(
    {
      query: `repo:^${escapeRegExp(convertedRepo ?? project)}$`,
    },
    fetch
  );
  if (result.kind === "error") {
    throw new Error(`Failed to list repositories: ${result.error}`);
  }

  const repo = result.results.repositories[0];
  const fileUrl = repo?.fileUrlTemplate
    .replaceAll("{{.Version}}", revision ?? repo.branches[0].name)
    .replaceAll("{{.Path}}", file);

  setHeaders({
    "cache-control": "no-store,must-revalidate",
  });

  if (fileUrl && (await parent()).preferences.openGrokInstantRedirect) {
    throw redirect(301, fileUrl);
  }

  return { file, fileUrl };
};
