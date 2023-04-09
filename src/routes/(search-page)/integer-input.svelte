<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value: number;
  export let kind: "nonnegative" | "positive" = "nonnegative";
  export let size = 3;
  export let id: string;

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

<label for={id}
  ><slot /><input
    {id}
    type="text"
    inputmode="numeric"
    {size}
    bind:value={stringValue}
    class={`p-1 border shadow-sm focus:outline-none ${
      valid ? "border-slate-300 focus:border-sky-500" : "border-red-500"
    }`}
  /></label
>
