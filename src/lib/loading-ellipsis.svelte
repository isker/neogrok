<script lang="ts">
  import { navigating } from "$app/state";

  let count = $state(0);
  $effect(() => {
    if (navigating.type !== null) {
      const id = setInterval(() => count++, 250);
      return () => clearInterval(id);
    } else {
      count = 0;
    }
  });
</script>

{".".repeat(count % 4)}
