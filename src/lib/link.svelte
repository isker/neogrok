<script lang="ts">
  export let to: string;
</script>

<a
  class="text-cyan-700 dark:text-cyan-400 hover:underline decoration-1"
  href={to}
>
  <slot />
</a>
