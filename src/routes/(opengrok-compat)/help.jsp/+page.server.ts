import { redirect } from "@sveltejs/kit";

export const load: import("./$types").PageServerLoad = () => {
  redirect(301, "/syntax");
};
