import { devalueBypass } from "$lib/server/devalue-bypass";
import {
  listQuerySchema,
  type ListQuery,
  listRepositories,
  type ListRepositoriesResponse,
} from "$lib/server/zoekt-list-repositories";

export const POST = devalueBypass<ListQuery, ListRepositoriesResponse>(
  listQuerySchema,
  listRepositories,
);
