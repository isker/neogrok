<script lang="ts">
  import SearchQueryConversion from "./search-query-conversion.svelte";

  type Props = {
    data: import("./$types").PageData;
  };

  let { data }: Props = $props();
</script>

<SearchQueryConversion
  openGrokParams={data.params}
  luceneQuery={data.luceneQuery}
  zoektQuery={data.zoektQuery}
  warnings={data.warnings}
/>
