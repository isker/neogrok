<script lang="ts">
  import ChevronUp from "lucide-svelte/icons/chevron-up";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import { nextSortBy, type SortColumn, type SortBy } from "./table-sorting";

  type Props = {
    sortColumn: SortColumn;
    sortBy: SortBy | null;
    children: import("svelte").Snippet;
  };

  let { sortColumn, sortBy = $bindable(), children }: Props = $props();
</script>

<button
  class="w-full h-full flex justify-center items-center hover:bg-slate-200 dark:hover:bg-slate-700"
  onclick={() => {
    sortBy = nextSortBy(sortBy, sortColumn);
  }}
>
  {#if sortBy === null || sortBy.prop !== sortColumn.prop}
    <!-- Placeholder so there's no shift on activating a sort. -->
    <div class="flex-none w-4 h-4"></div>
  {:else if sortBy.direction === "ascending"}
    <ChevronUp class="flex-none" size={16} />
  {:else}
    <ChevronDown class="flex-none" size={16} />
  {/if}
  <span>{@render children()}</span>
</button>
