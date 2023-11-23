import type { Repository } from "$lib/server/zoekt-list-repositories";

export type SortColumn =
  | {
      prop: "shardCount" | "fileCount" | "indexBytes" | "contentBytes";
      kind: "number";
    }
  | {
      prop: "name" | "lastIndexed" | "lastCommit";
      kind: "string";
    };

export type SortBy = SortColumn & { direction: "ascending" | "descending" };

export const nextSortBy = (
  current: SortBy | null,
  clicked: SortColumn,
): SortBy | null => {
  if (current?.prop === clicked.prop) {
    if (current.direction === "ascending") {
      return { ...clicked, direction: "descending" };
    } else {
      return null;
    }
  } else {
    return { ...clicked, direction: "ascending" };
  }
};

export const createComparator = ({ prop, kind, direction }: SortBy) => {
  if (kind === "number" && direction === "ascending") {
    return ({ [prop]: a }: Repository, { [prop]: b }: Repository) => a - b;
  } else if (kind === "number" && direction === "descending") {
    return ({ [prop]: a }: Repository, { [prop]: b }: Repository) => b - a;
  } else if (kind === "string" && direction === "ascending") {
    return ({ [prop]: a }: Repository, { [prop]: b }: Repository) =>
      a < b ? -1 : a > b ? 1 : 0;
  } else if (kind === "string" && direction === "descending") {
    return ({ [prop]: a }: Repository, { [prop]: b }: Repository) =>
      b < a ? -1 : b > a ? 1 : 0;
  }
};
