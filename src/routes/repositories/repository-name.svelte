<script lang="ts">
  import Link from "$lib/link.svelte";

  export let name: string;
  export let url: string | null;
</script>

<div class="text-left">
  {#if url}<Link to={url}>{name}</Link>{:else}{name}{/if}
</div>
