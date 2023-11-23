<script lang="ts">
  import { ChevronUp, ChevronDown } from "lucide-svelte";
  import { nextSortBy, type SortColumn, type SortBy } from "./table-sorting";

  export let sortColumn: SortColumn;
  export let sortBy: SortBy | null;
</script>

<button
  class="w-full h-full flex justify-center items-center hover:bg-slate-200"
  on:click={() => {
    sortBy = nextSortBy(sortBy, sortColumn);
  }}
>
  {#if sortBy === null || sortBy.prop !== sortColumn.prop}
    <!-- Placeholder so there's no shift on activating a sort. -->
    <div class="flex-none w-4 h-4" />
  {:else if sortBy.direction === "ascending"}
    <ChevronUp class="flex-none" size={16} />
  {:else}
    <ChevronDown class="flex-none" size={16} />
  {/if}
  <span><slot /></span>
</button>
