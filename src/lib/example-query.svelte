<script lang="ts">
  import Link from "./link.svelte";
  import Expression from "./expression.svelte";
  type Props = {
    query: string;
    wrap?: boolean;
    page?: "search" | "repositories";
  };

  let { query, wrap = false, page = "search" }: Props = $props();
</script>

<Link
  to={`${page === "search" ? "/" : "/repositories"}?${new URLSearchParams({
    q: query,
  }).toString()}`}
>
  <Expression {wrap}>{query}</Expression>
</Link>
