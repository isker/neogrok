import type { Cookies } from "@sveltejs/kit";
import { getContext, setContext } from "svelte";

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
 * Whether to bypass explanatory OpenGrok compatibility pages by way of
 * instantly redirecting requests for OpenGrok compatibility URLs to their
 * neogrok equivalents where possible.
 */
export type OpenGrokInstantRedirect = boolean;
const openGrokInstantRedirectKey = "openGrokInstantRedirect";
const defaultOpenGrokInstantRedirect = true;
const openGrokInstantRedirectFromString = (x: string) => x === "true";

export type Preferences = {
  [searchTypeKey]: SearchType;
  [matchSortOrderKey]: MatchSortOrder;
  [fileMatchesCutoffKey]: FileMatchesCutoff;
  [openGrokInstantRedirectKey]: OpenGrokInstantRedirect;
};

/**
 * Parses server cookies into Preferences, which can then be used as Data during
 * both SSR and CSR.
 */
export const loadPreferences = (cookies: Cookies): Preferences => ({
  [searchTypeKey]: loadPreference(
    cookies,
    searchTypeKey,
    defaultSearchType,
    searchTypeFromString,
  ),
  [matchSortOrderKey]: loadPreference(
    cookies,
    matchSortOrderKey,
    defaultMatchSortOrder,
    matchSortOrderFromString,
  ),
  [fileMatchesCutoffKey]: loadPreference(
    cookies,
    fileMatchesCutoffKey,
    defaultFileMatchesCutoff,
    fileMatchesCutoffFromString,
  ),
  [openGrokInstantRedirectKey]: loadPreference(
    cookies,
    openGrokInstantRedirectKey,
    defaultOpenGrokInstantRedirect,
    openGrokInstantRedirectFromString,
  ),
});

const loadPreference = <T>(
  cookies: Cookies,
  key: string,
  defaultValue: T,
  fromString: (x: string) => T | null,
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

/** Exposes Preferences as reactive state for usage in components. Pushes writes into browser cookies. */
export class PreferencesState {
  #searchType: SearchType = $state(defaultSearchType);
  #matchSortOrder: MatchSortOrder = $state(defaultMatchSortOrder);
  #fileMatchesCutoff: FileMatchesCutoff = $state(defaultFileMatchesCutoff);
  #openGrokInstantRedirect: OpenGrokInstantRedirect = $state(
    defaultOpenGrokInstantRedirect,
  );

  constructor(initial: Preferences) {
    this.#searchType = initial.searchType;
    this.#matchSortOrder = initial.matchSortOrder;
    this.#fileMatchesCutoff = initial.fileMatchesCutoff;
    this.#openGrokInstantRedirect = initial.openGrokInstantRedirect;
  }

  get searchType() {
    return this.#searchType;
  }
  set searchType(v: SearchType) {
    this.#searchType = v;
    writeCookie(searchTypeKey, v);
  }

  get matchSortOrder() {
    return this.#matchSortOrder;
  }
  set matchSortOrder(v: MatchSortOrder) {
    this.#matchSortOrder = v;
    writeCookie(matchSortOrderKey, v);
  }

  get fileMatchesCutoff() {
    return this.#fileMatchesCutoff;
  }
  set fileMatchesCutoff(v: FileMatchesCutoff) {
    this.#fileMatchesCutoff = v;
    writeCookie(fileMatchesCutoffKey, v);
  }

  get openGrokInstantRedirect() {
    return this.#openGrokInstantRedirect;
  }
  set openGrokInstantRedirect(v: OpenGrokInstantRedirect) {
    this.#openGrokInstantRedirect = v;
    writeCookie(openGrokInstantRedirectKey, v);
  }
}

const writeCookie = (key: string, val: string | number | boolean) => {
  document.cookie = `${key}=${val};path=/;sameSite=lax`;
};

const prefsCtx = Symbol("preferences");

/** Transmutes raw Preferences data into contextually available PreferencesState. */
export const contextifyPreferences = (initial: Preferences) => {
  setContext(prefsCtx, new PreferencesState(initial));
};

/** Retrieves contextually available PreferencesState. */
export const usePreferences = (): PreferencesState => getContext(prefsCtx);
