<script lang="ts">
  export let id: string;
</script>

<h2 {id} class="text-xl font-semibold">
  <a href={`#${id}`} class="hover:underline">
    <slot />
  </a>
</h2>
