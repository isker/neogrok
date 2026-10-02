import { devalueBypass } from "#lib/server/devalue-bypass.js";
import {
  listQuerySchema,
  type ListQuery,
  listRepositories,
  type ListRepositoriesResponse,
} from "#lib/server/zoekt-list-repositories.js";

export const POST = devalueBypass<ListQuery, ListRepositoriesResponse>(
  listQuerySchema,
  listRepositories,
);
