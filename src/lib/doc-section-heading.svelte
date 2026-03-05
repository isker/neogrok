<script lang="ts">
  type Props = {
    id: string;
    element?: "h2" | "h3" | "caption";
    children: import("svelte").Snippet;
  };

  let { id, element = "h2", children }: Props = $props();
</script>

<svelte:element
  this={element}
  {id}
  class="font-semibold"
  class:text-xl={element !== "h3"}
  class:pb-2={element === "caption"}
>
  <a href={`#${id}`} class="hover:underline">
    {@render children()}
  </a>
</svelte:element>
