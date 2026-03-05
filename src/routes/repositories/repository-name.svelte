<script lang="ts">
  import Link from "$lib/link.svelte";

  type Props = {
    name: string;
    url: string | undefined;
  };

  let { name, url }: Props = $props();
</script>

<div class="text-left">
  {#if url}<Link to={url}>{name}</Link>{:else}{name}{/if}
</div>
