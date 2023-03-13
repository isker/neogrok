import { createContext, ReactNode, useEffect, useMemo, useState } from "react";

// Preferences are UI controls that do not affect the query itself. They are
// persisted in localStorage instead of the URL as they affect only UI behavior
// instead of the actual API request/response.
//
// TODO if we introduce SSR, these are going to have to become cookies. Cookies
// are scary, but they're the only way to implement isomorphic persistent state.
const useTypedLocalStorageValue = <T,>(
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

export type SearchType = "live" | "manual";
const defaultSearchType = "live";
const searchTypeFromString = (x: string) =>
  x === "live" || x === "manual" ? x : null;

export type MatchSortOrder = "line-number" | "score";
const defaultMatchSortOrder = "line-number";
const matchSortOrderFromString = (x: string) =>
  x === "line-number" || x === "score" ? x : null;

const defaultFileMatchesCutoff = 5;
const fileMatchesCutoffFromString = (x: string) => {
  const parsed = Number.parseInt(x, 10);
  return parsed > 0 ? parsed : null;
};

export type PreferencesType = {
  searchType: SearchType;
  setSearchType: (searchType: SearchType) => void;

  matchSortOrder: MatchSortOrder;
  setMatchSortOrder: (matchSortOrder: MatchSortOrder) => void;

  fileMatchesCutoff: number;
  setFileMatchesCutoff: (fileMatchesCutoff: number) => void;
};

const unimplemented = () => {
  throw new Error("unimplemented");
};
export const Preferences = createContext<PreferencesType>({
  searchType: defaultSearchType,
  setSearchType: unimplemented,
  matchSortOrder: defaultMatchSortOrder,
  setMatchSortOrder: unimplemented,
  fileMatchesCutoff: defaultFileMatchesCutoff,
  setFileMatchesCutoff: unimplemented,
});

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [searchType, setSearchType] = useTypedLocalStorageValue(
    "searchType",
    defaultSearchType,
    searchTypeFromString,
    identity
  );
  const [matchSortOrder, setMatchSortOrder] = useTypedLocalStorageValue(
    "matchSortOrder",
    defaultMatchSortOrder,
    matchSortOrderFromString,
    identity
  );
  const [fileMatchesCutoff, setFileMatchesCutoff] = useTypedLocalStorageValue(
    "fileMatchesCutoff",
    defaultFileMatchesCutoff,
    fileMatchesCutoffFromString,
    numberToString
  );

  const preferences: PreferencesType = useMemo(
    () => ({
      searchType,
      setSearchType,
      matchSortOrder,
      setMatchSortOrder,
      fileMatchesCutoff,
      setFileMatchesCutoff,
    }),
    [
      searchType,
      setSearchType,
      matchSortOrder,
      setMatchSortOrder,
      fileMatchesCutoff,
      setFileMatchesCutoff,
    ]
  );

  return (
    <Preferences.Provider value={preferences}>{children}</Preferences.Provider>
  );
};

const identity = (x: string) => x;
const numberToString = (x: number) => x.toString();
