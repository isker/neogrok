<script lang="ts">
  import { updateRouteListQuery } from "./route-list-query";

  export let queryError: string | null;

  let query: string | undefined;
</script>

<!-- TODO this should integrate with preferences. -->
<label
  for="query"
  title="Same query syntax as the main search - use `r:name` to filter repositories by name, otherwise you are filtering them by their content!"
  class="flex"
>
  <span
    class="inline-block p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help"
  >
    Search repositories
  </span>
  <input
    bind:value={query}
    on:input={() => {
      updateRouteListQuery({ query });
    }}
    id="query"
    type="search"
    spellCheck={false}
    autoCorrect="off"
    autoCapitalize="off"
    autoComplete="off"
    class={`p-1 border shadow-sm focus:outline-none flex-auto appearance-none ${
      queryError === null
        ? "border-slate-300 focus:border-sky-500"
        : "border-red-500"
    }`}
  />
</label>
{#if queryError}
  <span class="text-sm text-red-500">{queryError}</span>
{/if}
