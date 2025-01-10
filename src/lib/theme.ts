import { readonly, writable } from "svelte/store";

export type BrowserTheme = "light" | "dark";

const query =
  "matchMedia" in globalThis ? matchMedia("(prefers-color-scheme:dark)") : null;
const writableTheme = writable<BrowserTheme>(query?.matches ? "dark" : "light");
query?.addEventListener("change", (event) => {
  writableTheme.set(event.matches ? "dark" : "light");
});

export const browserTheme = readonly(writableTheme);
