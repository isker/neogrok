<script lang="ts">
  import { usePreferences } from "$lib/preferences.svelte";
  import Zap from "lucide-svelte/icons/zap";

  const prefs = usePreferences();
</script>

<button
  class={`border-[1.5px] rounded w-6 grid place-items-center ${
    prefs.searchType === "live"
      ? "text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400"
      : "border-dashed border-black dark:border-white"
  }`}
  title={prefs.searchType === "live"
    ? "disable live search"
    : "enable live search"}
  onclick={() => {
    prefs.searchType = prefs.searchType === "live" ? "manual" : "live";
  }}
>
  <Zap class="inline" size={18} strokeWidth={1.5} />
</button>
