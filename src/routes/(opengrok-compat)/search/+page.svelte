<script lang="ts">
  import SearchQueryConversion from "./search-query-conversion.svelte";

  export let data: import("./$types").PageData;
</script>

<SearchQueryConversion
  openGrokParams={data.params}
  luceneQuery={data.luceneQuery}
  zoektQuery={data.zoektQuery}
  warnings={data.warnings}
/>
