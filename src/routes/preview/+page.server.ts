import { getFileContent } from "$lib/server/file-content";
import { error } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = async ({
  url,
  fetch,
  setHeaders,
}) => {
  const repository = url.searchParams.get("r");
  const fileName = url.searchParams.get("f");
  const branch = url.searchParams.get("b") ?? undefined;

  if (!repository || !fileName) {
    error(
      400,
      'Both the "r" (repository) and "f" (file) parameters are required',
    );
  }

  const response = await getFileContent(
    { repository, fileName, branch },
    fetch,
  );

  if (response.kind === "notFound") {
    error(404, `File "${fileName}" not found in repository "${repository}"`);
  } else if (response.kind === "error") {
    error(500, response.error);
  }

  setHeaders({
    "cache-control": "no-store,must-revalidate",
  });

  return { file: response.result };
};
