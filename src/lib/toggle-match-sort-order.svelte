<script lang="ts">
  import { acquireMatchSortOrderStore } from "$lib/preferences";
  import ListOrdered from "lucide-svelte/icons/list-ordered";

  const matchSortOrder = acquireMatchSortOrderStore();
</script>

<button
  class={`rounded w-6 grid place-items-center ${
    $matchSortOrder === "line-number"
      ? "bg-sky-500 hover:bg-slate-500"
      : "hover:bg-slate-300"
  }`}
  title={$matchSortOrder === "line-number"
    ? "sort matches by score"
    : "sort matches by line number"}
  on:click={() => {
    $matchSortOrder =
      $matchSortOrder === "line-number" ? "score" : "line-number";
  }}
>
  <ListOrdered
    class="inline"
    size={18}
    color={$matchSortOrder === "line-number" ? "white" : "black"}
    strokeWidth={1}
    fill={$matchSortOrder === "line-number" ? "white" : "black"}
  />
</button>
