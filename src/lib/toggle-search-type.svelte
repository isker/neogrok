<script lang="ts">
  import { acquireSearchTypeStore } from "$lib/preferences";
  import Zap from "lucide-svelte/icons/zap";

  const searchType = acquireSearchTypeStore();
</script>

<button
  class={`rounded w-6 grid place-items-center ${
    $searchType === "live"
      ? "bg-sky-500 hover:bg-slate-500"
      : "hover:bg-slate-300"
  }`}
  title={$searchType === "live" ? "disable live search" : "enable live search"}
  on:click={() => {
    $searchType = $searchType === "live" ? "manual" : "live";
  }}
>
  <Zap
    class="inline"
    size={18}
    color={$searchType === "live" ? "white" : "black"}
    strokeWidth={1}
    fill={$searchType === "live" ? "white" : "black"}
  />
</button>
