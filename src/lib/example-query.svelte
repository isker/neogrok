<script lang="ts">
  import Link from "./link.svelte";
  import Expression from "./expression.svelte";
  export let query: string;
  export let wrap = false;
</script>

<Link to={`/?${new URLSearchParams({ q: query }).toString()}`}>
  <Expression {wrap}>{query}</Expression>
</Link>
