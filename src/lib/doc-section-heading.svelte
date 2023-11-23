<script lang="ts">
  export let id: string;
  export let element: "h2" | "h3" | "caption" = "h2";
</script>

<svelte:element
  this={element}
  {id}
  class="font-semibold"
  class:text-xl={element !== "h3"}
  class:pb-2={element === "caption"}
>
  <a href={`#${id}`} class="hover:underline">
    <slot />
  </a>
</svelte:element>
