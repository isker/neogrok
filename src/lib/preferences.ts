import type { Cookies } from "@sveltejs/kit";
import { getContext, setContext } from "svelte";
import { writable, type Writable } from "svelte/store";

export type SearchType = "live" | "manual";
const searchTypeKey = "searchType";
const defaultSearchType = "live";
const searchTypeFromString = (x: string) =>
  x === "live" || x === "manual" ? x : null;

export type MatchSortOrder = "line-number" | "score";
const matchSortOrderKey = "matchSortOrder";
const defaultMatchSortOrder = "line-number";
const matchSortOrderFromString = (x: string) =>
  x === "line-number" || x === "score" ? x : null;

export type FileMatchesCutoff = number;
const fileMatchesCutoffKey = "fileMatchesCutoff";
const defaultFileMatchesCutoff = 5;
const fileMatchesCutoffFromString = (x: string) => {
  const parsed = Number.parseInt(x, 10);
  return parsed > 0 ? parsed : null;
};

export type Preferences = {
  [searchTypeKey]: SearchType;
  [matchSortOrderKey]: MatchSortOrder;
  [fileMatchesCutoffKey]: FileMatchesCutoff;
};

export const loadPreferences = (cookies: Cookies): Preferences => ({
  [searchTypeKey]: loadPreference(
    cookies,
    searchTypeKey,
    defaultSearchType,
    searchTypeFromString
  ),
  [matchSortOrderKey]: loadPreference(
    cookies,
    matchSortOrderKey,
    defaultMatchSortOrder,
    matchSortOrderFromString
  ),
  [fileMatchesCutoffKey]: loadPreference(
    cookies,
    fileMatchesCutoffKey,
    defaultFileMatchesCutoff,
    fileMatchesCutoffFromString
  ),
});

const loadPreference = <T>(
  cookies: Cookies,
  key: string,
  defaultValue: T,
  fromString: (x: string) => T | null
) => {
  const s = cookies.get(key);
  const parsed = s ? fromString(s) : null;
  if (parsed) {
    return parsed;
  } else {
    cookies.set(key, `${defaultValue}`, {
      path: "/",
      // preferences are updated in JS
      httpOnly: false,
      sameSite: "lax",
    });
    return defaultValue;
  }
};

export const persistInitialPreferences = (preferences: Preferences) => {
  Object.entries(preferences).forEach(([k, v]) =>
    setContext(k, createPreferenceStore(k, v))
  );
};

const createPreferenceStore = <T>(
  key: string,
  initialValue: T
): Writable<T> => {
  const delegate = writable(initialValue);
  return {
    subscribe: (...args) => delegate.subscribe(...args),
    set: (val) => {
      // We are counting on all keys and values being valid cookie keys/values,
      // without escaping.
      document.cookie = `${key}=${val};path=/;sameSite=lax`;
      delegate.set(val);
    },
    update: () => {
      throw new Error(`unimplemented`);
    },
  };
};

export const acquireSearchTypeStore = (): Writable<SearchType> =>
  getContext(searchTypeKey);
export const acquireMatchSortOrderStore = (): Writable<MatchSortOrder> =>
  getContext(matchSortOrderKey);
export const acquireFileMatchesCutoffStore = (): Writable<FileMatchesCutoff> =>
  getContext(fileMatchesCutoffKey);
