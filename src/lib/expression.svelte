<script lang="ts">
  export let wrap = false;
</script>

<code
  class="bg-gray-100 dark:bg-gray-800 p-1 text-sm"
  class:whitespace-pre-wrap={wrap}
  class:whitespace-nowrap={!wrap}><slot /></code
>
