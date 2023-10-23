<script lang="ts">
  import { navigating } from "$app/stores";
  import { derived } from "svelte/store";

  const count = derived<typeof navigating, number>(
    navigating,
    ($n, set, update) => {
      if ($n !== null) {
        const id = setInterval(() => update((c) => c + 1), 250);
        return () => clearInterval(id);
      } else {
        set(0);
      }
    },
    0,
  );
</script>

{".".repeat($count % 4)}
