import { loadPreferences } from "$lib/preferences";

export const load: import("./$types").LayoutServerLoad = ({ cookies }) => {
  return {
    // While not all pages need preferences, most do. It's easiest to just make
    // them ubiquitously available.
    preferences: loadPreferences(cookies),
  };
};
