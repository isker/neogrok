import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchQuery } from "./search-api";

const defaultQueryOptions: Omit<SearchQuery, "q"> = Object.freeze({
  contextLines: 1,
  files: 50,
  matchesPerShard: 1e6,
  totalMatches: 1e7,
});

type RouteSearchQuery = Omit<SearchQuery, "q"> & {
  readonly q: string | undefined;
};
type RouteSearchQuerySetters = {
  setQuery(q: string): void;
  setContextLines(contextLines: number): void;
  setFiles(files: number): void;
  setMatchesPerShard(matchesPerShard: number): void;
  setTotalMatches(totalMatches: number): void;
};

export const useRouteSearchQuery = (): [
  RouteSearchQuery,
  RouteSearchQuerySetters
] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const routeQ = searchParams.get("q");
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
    const q = routeQ || undefined;
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
      q,
      contextLines,
      files,
      matchesPerShard,
      totalMatches,
    };
  }, [
    routeQ,
    routeContextLines,
    routeFiles,
    routeMatchesPerShard,
    routeTotalMatches,
  ]);
  const setQuery = useCallback(
    (q: string) => {
      if (q !== routeQ) {
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (q) {
              next.set("q", q);
            } else {
              next.delete("q");
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [routeQ, setSearchParams]
  );
  const setContextLines = useCallback(
    (contextLines: number) => {
      const stringified = contextLines.toString();
      if (contextLines >= 0 && stringified !== routeContextLines) {
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (contextLines === defaultQueryOptions.contextLines) {
              next.delete("contextLines");
            } else {
              next.set("contextLines", stringified);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [routeContextLines, setSearchParams]
  );
  const setFiles = useCallback(
    (files: number) => {
      const stringified = files.toString();
      if (files >= 0 && stringified !== routeFiles) {
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (files === defaultQueryOptions.files) {
              next.delete("files");
            } else {
              next.set("files", stringified);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [routeFiles, setSearchParams]
  );
  const setMatchesPerShard = useCallback(
    (matchesPerShard: number) => {
      const stringified = matchesPerShard.toString();
      if (matchesPerShard >= 0 && stringified !== routeMatchesPerShard) {
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (matchesPerShard === defaultQueryOptions.matchesPerShard) {
              next.delete("matchesPerShard");
            } else {
              next.set("matchesPerShard", stringified);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [routeMatchesPerShard, setSearchParams]
  );
  const setTotalMatches = useCallback(
    (totalMatches: number) => {
      const stringified = totalMatches.toString();
      if (totalMatches >= 0 && stringified !== routeTotalMatches) {
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (totalMatches === defaultQueryOptions.totalMatches) {
              next.delete("totalMatches");
            } else {
              next.set("totalMatches", stringified);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [routeTotalMatches, setSearchParams]
  );

  return [
    searchQuery,
    {
      setQuery,
      setContextLines,
      setFiles,
      setMatchesPerShard,
      setTotalMatches,
    },
  ];
};
