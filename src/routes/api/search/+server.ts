import { devalueBypass } from "#lib/server/devalue-bypass.js";
import {
  searchQuerySchema,
  type SearchQuery,
  search,
  type SearchResponse,
} from "#lib/server/search-api.js";

export const POST = devalueBypass<SearchQuery, SearchResponse>(
  searchQuerySchema,
  search,
);
