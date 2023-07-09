<script lang="ts">
  import {
    acquireOpenGrokInstantRedirectStore,
    persistInitialPreferences,
  } from "$lib/preferences";
  import SearchQueryConversion from "./search-query-conversion.svelte";

  export let data: import("./$types").PageData;

  persistInitialPreferences(data.preferences);

  const openGrokInstantRedirect = acquireOpenGrokInstantRedirectStore();
</script>

<SearchQueryConversion
  openGrokParams={data.params}
  luceneQuery={data.luceneQuery}
  zoektQuery={data.zoektQuery}
  warnings={data.warnings}
/>

<section class="space-y-2">
  <h2 class="text-lg">
    Want to get redirected straight to the search page next time?
  </h2>
  <label class="text-sm">
    <!-- TODO provide a centralized preferences UI. -->
    <input type="checkbox" bind:checked={$openGrokInstantRedirect} /> Redirect me
    from old OpenGrok URLs automatically when possible. (For now, you have to clear
    cookies to undo this; sorry!)</label
  >
</section>
