<script lang="ts">
  import { usePreferences } from "$lib/preferences.svelte";
  import ListOrdered from "lucide-svelte/icons/list-ordered";

  const prefs = usePreferences();
</script>

<button
  class={`border-[1.5px] rounded w-6 grid place-items-center ${
    prefs.matchSortOrder === "line-number"
      ? "text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400"
      : "border-dashed border-black dark:border-white"
  }`}
  title={prefs.matchSortOrder === "line-number"
    ? "sort matches by score"
    : "sort matches by line number"}
  onclick={() => {
    prefs.matchSortOrder =
      prefs.matchSortOrder === "line-number" ? "score" : "line-number";
  }}
>
  <ListOrdered class="inline" size={18} strokeWidth={1.5} />
</button>
