import { escapeRegExp } from "$lib/regexp";
import { configuration } from "$lib/server/configuration";
import { listRepositories } from "$lib/server/zoekt-list-repositories";
import { evaluateFileUrlTemplate } from "$lib/url-templates";
import { error, redirect } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = async ({
  url,
  params: { file, project },
  parent,
  setHeaders,
  fetch,
}) => {
  if (!file) {
    error(404);
  }
  const revision = url.searchParams.get("r");
  const convertedRepo = configuration.openGrokProjectMappings.get(project);

  const result = await listRepositories(
    {
      query: `repo:^${escapeRegExp(convertedRepo ?? project)}$`,
    },
    fetch,
  );
  if (result.kind === "error") {
    throw new Error(`Failed to list repositories: ${result.error}`);
  }

  const repo = result.results.repositories[0];
  const fileUrl =
    repo?.fileUrlTemplate &&
    evaluateFileUrlTemplate(
      repo.fileUrlTemplate,
      revision ?? repo.branches[0]?.name,
      file,
    );

  setHeaders({
    "cache-control": "no-store,must-revalidate",
  });

  if (fileUrl && (await parent()).preferences.openGrokInstantRedirect) {
    redirect(301, fileUrl);
  }

  return { file, fileUrl };
};
