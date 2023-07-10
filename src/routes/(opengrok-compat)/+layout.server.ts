import { loadPreferences } from "$lib/preferences";

export const load: import("./$types").LayoutServerLoad = ({ cookies }) => {
  return { preferences: loadPreferences(cookies) };
};
