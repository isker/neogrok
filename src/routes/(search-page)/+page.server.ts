import { loadPreferences } from "$lib/preferences";

export const load: import("./$types").PageServerLoad = ({ cookies }) => {
  return {
    preferences: loadPreferences(cookies),
  };
};
