<script lang="ts">
  type Props = {
    wrap?: boolean;
    children: import("svelte").Snippet;
  };

  let { wrap = false, children }: Props = $props();
</script>

<code
  class="bg-gray-100 dark:bg-gray-800 p-1 text-sm"
  class:whitespace-pre-wrap={wrap}
  class:whitespace-nowrap={!wrap}>{@render children()}</code
>
