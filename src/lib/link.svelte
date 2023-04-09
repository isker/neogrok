<script lang="ts">
  export let to: string;
</script>

<a class="text-cyan-700 hover:underline decoration-1" href={to}>
  <slot />
</a>
