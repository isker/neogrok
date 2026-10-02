import { escapeRegExp } from "#lib/regexp.js";
import { configuration } from "#lib/server/configuration.js";
import { listRepositories } from "#lib/server/zoekt-list-repositories.js";
import { evaluateFileUrlTemplate } from "#lib/url-templates.js";
import { redirect } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = async ({
  params: { file, project },
  parent,
  setHeaders,
  fetch,
}) => {
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

  let destinationUrl: string | null | undefined;
  if (file) {
    destinationUrl =
      repo?.fileUrlTemplate &&
      evaluateFileUrlTemplate(
        repo.fileUrlTemplate,
        repo.branches[0]?.name,
        file,
      );
  } else {
    destinationUrl = repo?.url;
  }

  setHeaders({
    "cache-control": "no-store,must-revalidate",
  });

  if (destinationUrl && (await parent()).preferences.openGrokInstantRedirect) {
    redirect(301, destinationUrl, { external: true });
  }

  return { file, destinationUrl };
};
