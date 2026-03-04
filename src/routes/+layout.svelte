<script lang="ts">
  import { page } from "$app/stores";
  import { persistInitialPreferences } from "$lib/preferences";
  import "../app.css";

  const navLinks = [
    ["/", "Search"],
    ["/repositories", "Repositories"],
    ["/syntax", "Query Syntax"],
    ["/about", "About"],
    ["/preferences", "Preferences"],
  ] as const;

  export let data: import("./$types").LayoutServerData;
  persistInitialPreferences(data.preferences);
</script>

<div class="container mx-auto px-2 py-4">
  <nav class="pb-12">
    <ul class="flex justify-center text-xs gap-y-2 flex-wrap">
      {#each navLinks as [url, text]}
        <!-- FIXME when the flexbox wraps, there are dangling '•'s. Can use a
        whitespace `after` with a background-image instead (whitespace will
        collapse), but I'd have to understand SVG to do that. -->
        <li
          class="after:content-['•'] after:pl-2 after:pr-2 last:after:content-none"
        >
          {#if url === $page.url.pathname}
            {text}{:else}
            <a
              class="text-cyan-700 dark:text-cyan-400"
              href={`${url}${
                // On non-opengrok-compatibility pages, preserve the query
                // string so that search queries are preserved across
                // navigations. This is useful when moving back and forth
                // between the main search and the repo search, or the main
                // search and the query syntax page.
                $page.route.id?.startsWith("/(opengrok-compat)/")
                  ? ""
                  : $page.url.search
              }`}>{text}</a
            >{/if}
        </li>
      {/each}
    </ul>
  </nav>
  <main>
    <slot />
  </main>
</div>
