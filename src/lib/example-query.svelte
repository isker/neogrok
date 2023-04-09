<script lang="ts">
  import Link from "./link.svelte";
  export let query: string;
</script>

<Link to={`/?${new URLSearchParams({ q: query }).toString()}`}>
  <code class="bg-gray-200 p-1 whitespace-nowrap text-sm">{query}</code>
</Link>
