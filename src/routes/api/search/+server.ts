import { devalueBypass } from "$lib/server/devalue-bypass";
import {
  searchQuerySchema,
  type SearchQuery,
  search,
  type SearchResponse,
} from "$lib/server/search-api";

export const POST = devalueBypass<SearchQuery, SearchResponse>(
  searchQuerySchema,
  search,
);
