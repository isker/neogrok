import { browser } from "$app/environment";
import { createSubscriber } from "svelte/reactivity";

class CatchUpMediaQuery {
  readonly #query = browser
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : undefined;
  #current = this.#query?.matches ?? false;
  readonly #subscribe = createSubscriber((update) => {
    const query = this.#query;
    if (!query) {
      return;
    }

    const sync = () => {
      const current = query.matches;
      if (current !== this.#current) {
        this.#current = current;
        update();
      }
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        sync();
      }
    };

    // A suspended page can miss or delay the media query's change event.
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    sync();

    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
    };
  });

  get current(): boolean {
    this.#subscribe();
    this.#current = this.#query?.matches ?? false;
    return this.#current;
  }
}

export const prefersDark = new CatchUpMediaQuery();
