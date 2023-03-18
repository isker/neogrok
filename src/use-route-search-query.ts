import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchType } from "./preferences";
import type { SearchQuery } from "./search-api";

const defaultQueryOptions: Omit<SearchQuery, "query"> = Object.freeze({
  contextLines: 1,
  files: 50,
  matchesPerShard: 1e4,
  totalMatches: 1e5,
});

type RouteSearchQuery = Omit<SearchQuery, "query"> & {
  readonly query: string | undefined;
};

type UpdateRouteSearchQuery = (updates: {
  query?: string;
  contextLines?: number;
  files?: number;
  matchesPerShard?: number;
  totalMatches?: number;

  searchType: SearchType;
}) => void;

export const parseSearchParams = (
  searchParams: URLSearchParams
): RouteSearchQuery => {
  const parsedContextLines = Number.parseInt(
    searchParams.get("contextLines") ?? "",
    10
  );
  const parsedFiles = Number.parseInt(searchParams.get("files") ?? "", 10);
  const parsedMatchesPerShard = Number.parseInt(
    searchParams.get("matchesPerShard") ?? "",
    10
  );
  const parsedTotalMatches = Number.parseInt(
    searchParams.get("totalMatches") ?? "",
    10
  );

  // coerce empty string to undefined
  const query = searchParams.get("q") || undefined;
  const contextLines =
    parsedContextLines >= 0
      ? parsedContextLines
      : defaultQueryOptions.contextLines;
  const files = parsedFiles > 0 ? parsedFiles : defaultQueryOptions.files;
  const matchesPerShard =
    parsedMatchesPerShard >= 0
      ? parsedMatchesPerShard
      : defaultQueryOptions.matchesPerShard;
  const totalMatches =
    parsedTotalMatches >= 0
      ? parsedTotalMatches
      : defaultQueryOptions.totalMatches;
  return {
    query,
    contextLines,
    files,
    matchesPerShard,
    totalMatches,
  };
};

export const useRouteSearchQuery = (): [
  RouteSearchQuery,
  UpdateRouteSearchQuery
] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams]
  );

  const lastNavigateTime = useRef(0);
  const updateSearchQuery = useCallback(
    ({
      query,
      contextLines,
      files,
      matchesPerShard,
      totalMatches,
      searchType,
    }: {
      query?: string;
      contextLines?: number;
      files?: number;
      matchesPerShard?: number;
      totalMatches?: number;
      searchType: SearchType;
    }) => {
      const queryChanged =
        query !== undefined && (query || undefined) !== searchQuery.query;
      const contextLinesChanged =
        contextLines !== undefined &&
        contextLines >= 0 &&
        contextLines !== searchQuery.contextLines;
      const filesChanged =
        files !== undefined && files >= 0 && files !== searchQuery.files;
      const matchesPerShardChanged =
        matchesPerShard !== undefined &&
        matchesPerShard >= 0 &&
        matchesPerShard !== searchQuery.matchesPerShard;
      const totalMatchesChanged =
        totalMatches !== undefined &&
        totalMatches >= 0 &&
        totalMatches !== searchQuery.totalMatches;

      if (
        queryChanged ||
        contextLinesChanged ||
        filesChanged ||
        matchesPerShardChanged ||
        totalMatchesChanged
      ) {
        const now = Date.now();
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);

            if (queryChanged && query) {
              next.set("q", query);
            } else if (queryChanged) {
              next.delete("q");
            }

            if (
              contextLinesChanged &&
              contextLines === defaultQueryOptions.contextLines
            ) {
              next.delete("contextLines");
            } else if (contextLinesChanged) {
              next.set("contextLines", contextLines.toString());
            }

            if (filesChanged && files === defaultQueryOptions.files) {
              next.delete("files");
            } else if (filesChanged) {
              next.set("files", files.toString());
            }

            if (
              matchesPerShardChanged &&
              matchesPerShard === defaultQueryOptions.matchesPerShard
            ) {
              next.delete("matchesPerShard");
            } else if (matchesPerShardChanged) {
              next.set("matchesPerShard", matchesPerShard.toString());
            }

            if (
              totalMatchesChanged &&
              totalMatches === defaultQueryOptions.totalMatches
            ) {
              next.delete("totalMatches");
            } else if (totalMatchesChanged) {
              next.set("totalMatches", totalMatches.toString());
            }

            return next;
          },
          {
            replace:
              searchType === "live" && now - lastNavigateTime.current < 2000,
          }
        );
        lastNavigateTime.current = now;
      }
    },
    [searchQuery, setSearchParams]
  );

  return [searchQuery, updateSearchQuery];
};
