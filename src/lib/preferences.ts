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

/**
 * Whether the user has opted to bypass explanatory OpenGrok compatibility pages
 * by way of instantly redirecting requests for OpenGrok compatibility URLs to
 * their neogrok equivalents where possible.
 */
export type OpenGrokInstantRedirect = boolean;
const openGrokInstantRedirectKey = "openGrokInstantRedirect";
const defaultOpenGrokInstantRedirect = false;
const openGrokInstantRedirectFromString = (x: string) => x === "true";

export type Preferences = {
  [searchTypeKey]: SearchType;
  [matchSortOrderKey]: MatchSortOrder;
  [fileMatchesCutoffKey]: FileMatchesCutoff;
  [openGrokInstantRedirectKey]: OpenGrokInstantRedirect;
};

/**
 * Called during server load to parse cookies into Preferences, which can then
 * be used as Data during both SSR and CSR.
 */
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
  [openGrokInstantRedirectKey]: loadPreference(
    cookies,
    openGrokInstantRedirectKey,
    defaultOpenGrokInstantRedirect,
    openGrokInstantRedirectFromString
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
  if (parsed !== null) {
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

/**
 * Called during page component initialization to create the relevant stores.
 */
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

// These are functions that can be called during component initialization to get
// stores that work on CSR and SSR. We use context for this to mitigate
// SvelteKit's abominable store semantics on SSR:
// https://github.com/sveltejs/kit/discussions/4339
export const acquireSearchTypeStore = (): Writable<SearchType> =>
  getContext(searchTypeKey);
export const acquireMatchSortOrderStore = (): Writable<MatchSortOrder> =>
  getContext(matchSortOrderKey);
export const acquireFileMatchesCutoffStore = (): Writable<FileMatchesCutoff> =>
  getContext(fileMatchesCutoffKey);
export const acquireOpenGrokInstantRedirectStore =
  (): Writable<OpenGrokInstantRedirect> =>
    getContext(openGrokInstantRedirectKey);
