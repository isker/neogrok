<script lang="ts">
  import { acquireMatchSortOrderStore } from "$lib/preferences";
  import ListOrdered from "lucide-svelte/icons/list-ordered";

  const matchSortOrder = acquireMatchSortOrderStore();
</script>

<button
  class={`border-[1.5px] rounded w-6 grid place-items-center ${
    $matchSortOrder === "line-number"
      ? "text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400"
      : "border-dashed border-black dark:border-white"
  }`}
  title={$matchSortOrder === "line-number"
    ? "sort matches by score"
    : "sort matches by line number"}
  on:click={() => {
    $matchSortOrder =
      $matchSortOrder === "line-number" ? "score" : "line-number";
  }}
>
  <ListOrdered class="inline" size={18} strokeWidth={1.5} />
</button>
