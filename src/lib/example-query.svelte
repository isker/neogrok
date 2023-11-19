<script lang="ts">
  import Link from "./link.svelte";
  import Expression from "./expression.svelte";
  export let query: string;
  export let wrap = false;
  export let page: "search" | "repositories" = "search";
</script>

<Link
  to={`${page === "search" ? "/" : "/repositories"}?${new URLSearchParams({
    q: query,
  }).toString()}`}
>
  <Expression {wrap}>{query}</Expression>
</Link>
