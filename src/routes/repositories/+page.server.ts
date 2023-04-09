import {
  listRepositories,
  type ListResults,
} from "./list-repositories-api.server";
import { parseSearchParams } from "./route-list-query";

export const load: import("./$types").PageServerLoad = async ({
  url,
  fetch,
}) => {
  return {
    listOutcome: await executeList(url, fetch),
  };
};

type ListOutcome =
  | { kind: "success"; results: ListResults }
  | { kind: "error"; error: string };

const executeList = async (url: URL, f: typeof fetch): Promise<ListOutcome> => {
  const { query } = parseSearchParams(url.searchParams);
  try {
    return await listRepositories({ query }, f);
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
