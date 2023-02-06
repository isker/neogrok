import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchQuery } from "./search-api";

const defaultQueryOptions: Omit<SearchQuery, "query"> = Object.freeze({
  contextLines: 1,
  files: 50,
  matchesPerShard: 1e6,
  totalMatches: 1e7,
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

  // replace history entry instead of adding
  replace?: boolean;
}) => void;

export const useRouteSearchQuery = (): [
  RouteSearchQuery,
  UpdateRouteSearchQuery
] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const routeQuery = searchParams.get("q");
  const routeContextLines = searchParams.get("contextLines");
  const routeFiles = searchParams.get("files");
  const routeMatchesPerShard = searchParams.get("matchesPerShard");
  const routeTotalMatches = searchParams.get("totalMatches");

  const searchQuery = useMemo(() => {
    const parsedContextLines = Number.parseInt(routeContextLines ?? "", 10);
    const parsedFiles = Number.parseInt(routeFiles ?? "", 10);
    const parsedMatchesPerShard = Number.parseInt(
      routeMatchesPerShard ?? "",
      10
    );
    const parsedTotalMatches = Number.parseInt(routeTotalMatches ?? "", 10);

    // coerce empty string to undefined
    const query = routeQuery || undefined;
    const contextLines =
      parsedContextLines >= 0
        ? parsedContextLines
        : defaultQueryOptions.contextLines;
    const files = parsedFiles >= 0 ? parsedFiles : defaultQueryOptions.files;
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
  }, [
    routeQuery,
    routeContextLines,
    routeFiles,
    routeMatchesPerShard,
    routeTotalMatches,
  ]);

  const updateSearchQuery = useCallback(
    ({
      query,
      contextLines,
      files,
      matchesPerShard,
      totalMatches,
      replace,
    }: {
      query?: string;
      contextLines?: number;
      files?: number;
      matchesPerShard?: number;
      totalMatches?: number;
      replace?: boolean;
    }) => {
      const queryChanged = query !== undefined && query !== searchQuery.query;
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
          { replace }
        );
      }
    },
    [searchQuery, setSearchParams]
  );

  return [searchQuery, updateSearchQuery];
};
