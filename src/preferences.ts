import { useEffect, useState } from "react";

// Preferences are UI controls that do not affect the query itself. They are
// persisted in localStorage instead of the URL as they affect only UI behavior
// instead of the actual API request/response.
const useTypedLocalStorageValue = <T>(
  key: string,
  defaultValue: T,
  fromString: (x: string) => T | null,
  toString: (t: T) => string
) => {
  const [parsedValue, setParsedValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? fromString(storedValue) ?? defaultValue : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, toString(parsedValue));
  }, [key, parsedValue, toString]);

  return [parsedValue, setParsedValue] as const;
};

const identity = (x: string) => x;
const numberToString = (x: number) => x.toString();

type SearchType = "live" | "manual";
export const useSearchType = (): readonly [
  SearchType,
  (searchType: SearchType) => void
] =>
  useTypedLocalStorageValue(
    "searchType",
    "live",
    searchTypeFromString,
    identity
  );
const searchTypeFromString = (x: string) =>
  x === "live" || x === "manual" ? x : null;

type MatchSortOrder = "line-number" | "score";
export const useMatchSortOrder = (): readonly [
  MatchSortOrder,
  (searchType: MatchSortOrder) => void
] =>
  useTypedLocalStorageValue(
    "matchSortOrder",
    "line-number",
    matchSortOrderFromString,
    identity
  );
const matchSortOrderFromString = (x: string) =>
  x === "line-number" || x === "score" ? x : null;

export const useFileMatchesCutoff = (): readonly [
  number,
  (searchType: number) => void
] =>
  useTypedLocalStorageValue(
    "fileMatchesCutoff",
    5,
    fileMatchesCutoffFromString,
    numberToString
  );
const fileMatchesCutoffFromString = (x: string) => {
  const parsed = Number.parseInt(x, 10);
  return parsed > 0 ? parsed : null;
};
