<script lang="ts">
  import { usePreferences } from "$lib/preferences.svelte";
  import IntegerInput from "$lib/integer-input.svelte";

  const prefs = usePreferences();
</script>

<svelte:head>
  <title>Preferences - neogrok</title>
</svelte:head>

<div class="space-y-4 max-w-4xl mx-auto">
  <h1 class="text-2xl text-center">Preferences</h1>
  <p class="text-sm text-center">
    i.e., persistent configuration that lives in cookies
  </p>
  <section class="space-y-2">
    <h2 class="text-xl font-medium">Search</h2>
    <fieldset>
      <legend class="text-lg">Search type</legend>
      <div>
        <label for="live" class="cursor-pointer">
          <input
            id="live"
            type="radio"
            name="search-type"
            bind:group={prefs.searchType}
            value="live"
          />
          Live as you type
        </label>
      </div>
      <div>
        <label for="manual" class="cursor-pointer">
          <input
            id="manual"
            type="radio"
            name="search-type"
            bind:group={prefs.searchType}
            value="manual"
          />
          Manual (hit enter to search)
        </label>
      </div>
    </fieldset>
    <fieldset>
      <legend class="text-lg">Sort order of matches within a file</legend>
      <div>
        <label for="line-number" class="cursor-pointer">
          <input
            id="line-number"
            type="radio"
            name="sort"
            bind:group={prefs.matchSortOrder}
            value="line-number"
          />
          By line number
        </label>
      </div>
      <div>
        <label for="score" class="cursor-pointer">
          <input
            id="score"
            type="radio"
            name="sort"
            bind:group={prefs.matchSortOrder}
            value="score"
          />
          By score according to zoekt
        </label>
      </div>
    </fieldset>
    <div>
      <label for="file-matches-cutoff">
        <div class="text-lg">Initially visible matches per file</div>
        <IntegerInput
          id="file-matches-cutoff"
          pending={false}
          bind:value={prefs.fileMatchesCutoff}
        />
      </label>
    </div>
  </section>
  <section class="space-y-2">
    <h2 class="text-xl font-medium">OpenGrok compatibility</h2>
    <div>
      <span class="text-lg">Redirects</span>
      <div>
        <label class="text-sm">
          <input type="checkbox" bind:checked={prefs.openGrokInstantRedirect} /> Automatically
          redirect from old OpenGrok URLs when possible.</label
        >
      </div>
    </div>
  </section>
</div>
