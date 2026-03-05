<script lang="ts">
  import { computeInputColor } from "$lib/input-colors";

  type Props = {
    value: number;
    kind?: "nonnegative" | "positive";
    size?: number;
    id: string;
    pending: boolean;
    onChange?: (value: number) => void;
  };

  let {
    value = $bindable(),
    kind = "nonnegative",
    size = 3,
    id,
    pending,
    onChange,
  }: Props = $props();

  let stringValue = $state(value.toString());
  let valid = $derived(
    /^\d+$/.test(stringValue) &&
      (kind === "nonnegative" || stringValue !== "0"),
  );
  $effect(() => {
    if (valid) {
      const parsed = Number.parseInt(stringValue, 10);
      if (value !== parsed) {
        value = parsed;
        onChange?.(parsed);
      }
    }
  });
</script>

<input
  {id}
  type="text"
  inputmode="numeric"
  {size}
  bind:value={stringValue}
  class={`p-1 border shadow-xs focus:outline-hidden dark:bg-black ${computeInputColor(
    {
      error: !valid,
      pending,
    },
  )}`}
/>
