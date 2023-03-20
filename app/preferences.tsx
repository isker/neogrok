import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import BrowserCookies from "js-cookie";
import ServerCookies from "cookie";

// Preferences are UI controls that do not affect the query itself. They are
// persisted in cookies instead of the URL as they are specific to the user
// instead of the query.
//
// The considerations for determining whether something should be a preference
// instead of a URL paramter are:
// 1. If the URL for this page was shared with someone else, should this
//    configuration affect what they see?
// 2. Would a user be annoyed if they had to re-establish this configuration
//    every time they visited the site?
const useTypedBrowserCookieValue = <T,>(
  key: string,
  defaultValue: T,
  fromString: (x: string) => T | null,
  toString: (t: T) => string
) => {
  const [parsedValue, setParsedValue] = useState<T>(() =>
    parseTypedValue(BrowserCookies.get(key), defaultValue, fromString)
  );

  useEffect(() => {
    BrowserCookies.set(key, toString(parsedValue), { sameSite: "Strict" });
  }, [key, parsedValue, toString]);

  return [parsedValue, setParsedValue] as const;
};

const parseTypedValue = <T,>(
  rawValue: string | undefined,
  defaultValue: T,
  fromString: (x: string) => T | null
) => (rawValue ? fromString(rawValue) ?? defaultValue : defaultValue);

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

export type PreferencesData = {
  readonly searchType: SearchType;
  readonly matchSortOrder: MatchSortOrder;
  readonly fileMatchesCutoff: number;
};

export type PreferencesContext = PreferencesData & {
  readonly setSearchType: (searchType: SearchType) => void;
  readonly setMatchSortOrder: (matchSortOrder: MatchSortOrder) => void;
  readonly setFileMatchesCutoff: (fileMatchesCutoff: number) => void;
};

const unimplemented = () => {
  throw new Error("unimplemented");
};
export const Preferences = createContext<PreferencesContext>({
  searchType: defaultSearchType,
  setSearchType: unimplemented,
  matchSortOrder: defaultMatchSortOrder,
  setMatchSortOrder: unimplemented,
  fileMatchesCutoff: defaultFileMatchesCutoff,
  setFileMatchesCutoff: unimplemented,
});

export const BrowserPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [searchType, setSearchType] = useTypedBrowserCookieValue(
    "searchType",
    defaultSearchType,
    searchTypeFromString,
    identity
  );
  const [matchSortOrder, setMatchSortOrder] = useTypedBrowserCookieValue(
    "matchSortOrder",
    defaultMatchSortOrder,
    matchSortOrderFromString,
    identity
  );
  const [fileMatchesCutoff, setFileMatchesCutoff] = useTypedBrowserCookieValue(
    "fileMatchesCutoff",
    defaultFileMatchesCutoff,
    fileMatchesCutoffFromString,
    numberToString
  );

  const preferences: PreferencesContext = useMemo(
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

export const parseServerPreferences = (
  cookieHeader: string | null
): PreferencesData => {
  const cookies = cookieHeader ? ServerCookies.parse(cookieHeader) : {};

  const searchType = parseTypedValue(
    cookies.searchType,
    defaultSearchType,
    searchTypeFromString
  );
  const matchSortOrder = parseTypedValue(
    cookies.matchSortOrder,
    defaultMatchSortOrder,
    matchSortOrderFromString
  );
  const fileMatchesCutoff = parseTypedValue(
    cookies.fileMatchesCutoff,
    defaultFileMatchesCutoff,
    fileMatchesCutoffFromString
  );

  return { searchType, matchSortOrder, fileMatchesCutoff };
};

export const ServerPreferencesProvider = ({
  serverPreferences,
  children,
}: {
  serverPreferences: PreferencesData;
  children: ReactNode;
}) => {
  const preferences: PreferencesContext = useMemo(
    () => ({
      ...serverPreferences,
      setSearchType: cantSetOnServer,
      setMatchSortOrder: cantSetOnServer,
      setFileMatchesCutoff: cantSetOnServer,
    }),
    // In reality there is only one serverPreferences object ever created per
    // request, so memoizing is pointless.
    [serverPreferences]
  );

  return (
    <Preferences.Provider value={preferences}>{children}</Preferences.Provider>
  );
};

const cantSetOnServer = () => {
  throw new Error("Can't set preferences values on the server!");
};
