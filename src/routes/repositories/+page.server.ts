import {
  listRepositories,
  type ListResults,
} from "./list-repositories-api.server";
import { parseSearchParams } from "./route-list-query";

export const load: import("./$types").PageServerLoad = async ({
  request,
  url,
}) => {
  return {
    listOutcome: await executeList(request, url),
  };
};

type ListOutcome =
  | { kind: "success"; results: ListResults }
  | { kind: "error"; error: string };

const executeList = async (
  request: Request,
  url: URL
): Promise<ListOutcome> => {
  const { query } = parseSearchParams(new URL(url).searchParams);
  try {
    return await listRepositories({ query }, request.signal);
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
    ) {
      console.error("List repositories failed", error);
    }
    return { kind: "error", error: String(error) };
  }
};
