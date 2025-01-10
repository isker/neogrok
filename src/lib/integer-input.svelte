<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { computeInputColor } from "$lib/input-colors";

  export let value: number;
  export let kind: "nonnegative" | "positive" = "nonnegative";
  export let size = 3;
  export let id: string;
  export let pending: boolean;

  const dispatch = createEventDispatcher<{ change: number }>();

  let stringValue = value.toString();
  let valid = true;

  $: {
    valid =
      /^\d+$/.test(stringValue) &&
      (kind === "nonnegative" || stringValue !== "0");
    if (valid) {
      const parsed = Number.parseInt(stringValue, 10);
      if (value !== parsed) {
        value = parsed;
        dispatch("change", parsed);
      }
    }
  }
</script>

<input
  {id}
  type="text"
  inputmode="numeric"
  {size}
  bind:value={stringValue}
  class={`p-1 border shadow-sm focus:outline-none dark:bg-black ${computeInputColor(
    {
      error: !valid,
      pending,
    },
  )}`}
/>
