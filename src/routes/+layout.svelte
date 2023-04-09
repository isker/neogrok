<script lang="ts">
  import { page } from "$app/stores";
  import "../app.css";

  const navLinks = [
    ["/", "Search"],
    ["/repositories", "Repositories"],
    ["/syntax", "Query Syntax"],
    ["/about", "About"],
  ] as const;
</script>

<div class="container mx-auto px-2">
  <nav class="pt-2 pb-12">
    <ul class="flex justify-center text-xs">
      {#each navLinks as [url, text]}
        <li class="after:content-['•'] after:px-2 last:after:content-none">
          {#if url === $page.url.pathname}
            {text}{:else}
            <a
              class="text-cyan-700"
              href={// Preserve query string so that search queries are preserved
              // across navigations. This is useful when moving back and
              // forth between the main search and the repo search, or the
              // main search and the query syntax page.
              `${url}${$page.url.search}`}>{text}</a
            >{/if}
        </li>
      {/each}
    </ul>
  </nav>
  <main>
    <slot />
  </main>
</div>
