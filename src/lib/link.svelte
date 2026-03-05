<script lang="ts">
  type Props = {
    to: string;
    children: import("svelte").Snippet;
  };

  let { to, children }: Props = $props();
</script>

<a
  class="text-cyan-700 dark:text-cyan-400 hover:underline decoration-1"
  href={to}
>
  {@render children()}
</a>
