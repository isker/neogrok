import type {
  ListQuery,
  ListRepositoriesResponse,
} from "$lib/server/zoekt-list-repositories";
import { parseSearchParams } from "./route-list-query";

export const load: import("./$types").PageLoad = async ({ url, fetch }) => {
  return {
    listOutcome: await executeList(url, fetch),
  };
};

const executeList = async (
  url: URL,
  f: typeof fetch,
): Promise<ListRepositoriesResponse> => {
  const listQuery: ListQuery = parseSearchParams(url.searchParams);
  try {
    const response = await f("/api/list", {
      method: "POST",
      body: JSON.stringify(listQuery),
      headers: { "content-type": "application/json" },
    });
    return await response.json();
  } catch (error) {
    console.error("List repositories failed", error);
    return { kind: "error", error: String(error) };
  }
};
