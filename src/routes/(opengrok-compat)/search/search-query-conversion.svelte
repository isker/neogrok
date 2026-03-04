<script lang="ts">
  import ExampleQuery from "$lib/example-query.svelte";
  import Expression from "$lib/expression.svelte";
  import Link from "$lib/link.svelte";
  import {
    renderWarning,
    type QueryLocation,
    type ZoektConversionWarning,
  } from "./conversion-warnings";

  export let openGrokParams: { readonly [key: string]: unknown };
  export let luceneQuery: string | null;
  export let zoektQuery: string | null;
  export let warnings: ReadonlyArray<ZoektConversionWarning>;

  let highlightedLocation: QueryLocation | null = null;

  $: renderedWarnings = warnings.map(renderWarning);

  type QueryToken =
    | { kind: "normal"; content: string }
    | { kind: "highlighted"; content: string };

  let renderedLuceneQuery: ReadonlyArray<QueryToken> | null;

  $: {
    if (highlightedLocation && luceneQuery) {
      renderedLuceneQuery = [
        {
          kind: "normal",
          content: luceneQuery.slice(0, highlightedLocation.start),
        },

        {
          kind: "highlighted",
          content: luceneQuery.slice(
            highlightedLocation.start,
            highlightedLocation.end,
          ),
        },
        {
          kind: "normal",
          content: luceneQuery.slice(highlightedLocation.end),
        },
      ];
    } else if (luceneQuery) {
      renderedLuceneQuery = [{ kind: "normal", content: luceneQuery }];
    } else {
      renderedLuceneQuery = null;
    }
  }
</script>

<section class="space-y-2">
  <div class="max-w-prose mx-auto">
    <h2 class="text-xl pt-2 text-center font-medium">
      Search query conversion
    </h2>
    <p>
      While zoekt and OpenGrok have substantially different search input
      semantics, we've made a best-effort conversion of the search query that
      brought you to this page from OpenGrok's Lucene syntax to
      <Link to="/syntax">neogrok's zoekt syntax</Link>.
    </p>
  </div>
  <div class="flex flex-wrap gap-4 justify-center">
    <div
      class="flex-auto space-y-2 border border-slate-300 rounded-md p-3 max-w-md"
    >
      <h3 class="text-center font-semibold">
        Detected OpenGrok URL parameters
      </h3>
      <pre
        class="bg-gray-100 dark:bg-gray-800 p-2 text-sm whitespace-normal">{JSON.stringify(
          openGrokParams,
          null,
          2,
        )}</pre>
    </div>
    <span
      class="flex-auto space-y-2 text-center border rounded-md p-3 max-w-sm"
      class:border-slate-300={renderedLuceneQuery !== null}
      class:border-orange-300={renderedLuceneQuery === null}
    >
      <h3 class="font-semibold">Input OpenGrok Lucene query</h3>
      <div>
        {#if renderedLuceneQuery === null}
          URL parameters contain no query inputs
        {:else}
          <Expression wrap
            >{#each renderedLuceneQuery as token}{#if token.kind === "highlighted"}<span
                  class="bg-orange-200 dark:bg-orange-800">{token.content}</span
                >{:else}{token.content}{/if}{/each}</Expression
          >
        {/if}
      </div>
    </span>

    <span
      class="flex-auto space-y-2 text-center border rounded-md p-3 max-w-sm"
      class:border-slate-300={renderedLuceneQuery === null}
      class:border-red-300={renderedLuceneQuery !== null && zoektQuery === null}
      class:border-sky-500={zoektQuery !== null}
    >
      <h3 class="font-semibold">Output zoekt query</h3>
      <div>
        {#if renderedLuceneQuery === null}
          <p>
            No Lucene query, nothing to do. Head on over to the neogrok <Link
              to="/">search page</Link
            > to get started.
          </p>
        {:else if zoektQuery === null}
          Conversion failed!
        {:else}
          <ExampleQuery wrap query={zoektQuery} />
        {/if}
      </div>
    </span>
    {#if warnings.length > 0}
      <span
        class="flex-auto space-y-2 border border-orange-300 rounded-md p-3 max-w-md"
      >
        <h3 class="text-center font-semibold">Conversion warnings</h3>
        <ul class="list-disc pl-2">
          {#each renderedWarnings as { message, location }}
            <li
              class="text-sm"
              on:mouseenter={() => {
                if (location) {
                  highlightedLocation = location;
                }
              }}
              on:mouseleave={() => {
                highlightedLocation = null;
              }}
            >
              {message}
            </li>
          {/each}
        </ul>
      </span>
    {/if}
  </div>
</section>
