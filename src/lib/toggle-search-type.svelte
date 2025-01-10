<script lang="ts">
  import { acquireSearchTypeStore } from "$lib/preferences";
  import Zap from "lucide-svelte/icons/zap";

  const searchType = acquireSearchTypeStore();
</script>

<button
  class={`border-[1.5px] rounded w-6 grid place-items-center ${
    $searchType === "live"
      ? "text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400"
      : "border-dashed border-black dark:border-white"
  }`}
  title={$searchType === "live" ? "disable live search" : "enable live search"}
  on:click={() => {
    $searchType = $searchType === "live" ? "manual" : "live";
  }}
>
  <Zap class="inline" size={18} strokeWidth={1.5} />
</button>
