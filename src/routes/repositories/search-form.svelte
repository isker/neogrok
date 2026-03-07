<script lang="ts">
  import { navigating, page } from "$app/state";
  import { usePreferences, type SearchType } from "$lib/preferences.svelte";
  import { computeInputColor } from "$lib/input-colors";
  import { parseSearchParams, updateRouteListQuery } from "./route-list-query";
  import ToggleSearchType from "$lib/toggle-search-type.svelte";
  import LoadingEllipsis from "$lib/loading-ellipsis.svelte";
  import IntegerInput from "$lib/integer-input.svelte";

  let routeListQuery = $derived(parseSearchParams(page.url.searchParams));

  type Props = {
    queryError: string | null;
  };

  let { queryError }: Props = $props();

  const prefs = usePreferences();

  // We need to do a complicated bidirectional mapping between the URL and the
  // form state. So, yes, this is intentional.
  // svelte-ignore state_referenced_locally
  let query: string | undefined = $state(routeListQuery.query);
  // svelte-ignore state_referenced_locally
  let repos: number = $state(routeListQuery.repos);
  $effect(() => {
    // Sync form values with route state whenever a navigation _not_ related to
    // direct user interactions with the form.  Those are inherently already
    // covered by the relevant input bindings, and the resulting navigations
    // can conflict with those bindings.
    if (navigating.type !== "goto") {
      ({ query, repos } = routeListQuery);
    }
  });

  const shouldLiveSearch = () =>
    prefs.searchType === "live" &&
    // Same trigram efficiency rules as on the main search page.
    (!query || query.length >= 3);

  const manualSubmit = () => {
    updateRouteListQuery({
      query,
      repos,
      searchType: prefs.searchType,
    });
  };

  // When switching from manual to live search, submit any pending changes.
  let previousSearchType: SearchType | undefined = $state();
  $effect(() => {
    if (prefs.searchType === "live" && previousSearchType === "manual") {
      manualSubmit();
    }
    previousSearchType = prefs.searchType;
  });

  // These all indicate when form changes with manual search are not yet submitted.
  let queryPending = $derived(
    navigating.type === null && (routeListQuery.query ?? "") !== (query ?? ""),
  );
  let reposPending = $derived(
    navigating.type === null && routeListQuery.repos !== repos,
  );
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    manualSubmit();
  }}
>
  <!-- Make enter key submission work: https://stackoverflow.com/a/35235768 -->
  <input type="submit" class="hidden" />

  <div class="flex flex-wrap gap-y-2 justify-center whitespace-nowrap">
    <label for="query" class="flex-auto flex flex-col space-y-0.5">
      <span
        title="Same query syntax as the main search - use `r:name` to filter repositories by name, otherwise you are filtering them by their content!"
        class="text-xs px-1 text-gray-500 dark:text-gray-400"
        >query<LoadingEllipsis /></span
      >
      <span
        class={`flex flex-auto p-1 border shadow-xs space-x-1 ${computeInputColor(
          {
            error: queryError !== null,
            pending: queryPending,
          },
        )}`}
      >
        <!-- It's a search page, a11y be damned. cf. google.com, bing.com, etc. -->
        <!-- svelte-ignore a11y_autofocus -->
        <input
          bind:value={query}
          oninput={() => {
            if (shouldLiveSearch()) {
              updateRouteListQuery({ query, searchType: prefs.searchType });
            }
          }}
          id="query"
          type="search"
          autofocus
          spellcheck={false}
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          class="font-mono dark:bg-black focus:outline-hidden flex-auto appearance-none"
        />
        <ToggleSearchType />
      </span>
    </label>
    <label for="repos" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500 dark:text-gray-400">repos</span>
      <IntegerInput
        id="context"
        kind="positive"
        pending={reposPending}
        bind:value={repos}
        onChange={(value) => {
          if (shouldLiveSearch()) {
            updateRouteListQuery({
              repos: value,
              searchType: prefs.searchType,
            });
          }
        }}
      />
    </label>
  </div>
  <div class="text-xs text-red-500">{queryError ?? "\u200b"}</div>
</form>
