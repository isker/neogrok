import { useEffect, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const useSearchFormReactKey = () => {
  // We have some pretty gnarly requirements around the search form. The search
  // form projects the route into the form UI once upon mount, and then
  // continuously projects the form UI into the route from there on.
  //
  // This works fine, except on `popstate` (i.e. user hitting forward or back
  // button): suddenly, we need to once again project the route into the UI. To
  // make this happen, we force an unmount/remount by way of changing the `key`
  // on the SearchForm.
  const navigationType = useNavigationType();
  const { search, state } = useLocation();
  const [previousSearch, setPreviousSearch] = useState(search);
  useEffect(() => setPreviousSearch(search), [search]);
  const [key, setKey] = useState<string>();
  if (navigationType === "POP" && previousSearch !== search) {
    // This pattern (set state during render, then bail out of render) is in
    // fact a valid one.
    //
    // https://beta.reactjs.org/reference/react/useState#setstate-caveats
    // "Calling the set function during rendering is only allowed from within
    // the currently rendering component. React will discard its output and
    // immediately attempt to render it again with the new state."

    // The actual key we set doesn't much matter; Math.random() would not be
    // appreciably different.
    setKey(`${previousSearch}->${search}`);
    // Prevent loops by repeating this state's initializer.
    setPreviousSearch(search);
    return { key, keyChanged: true };
  } else if (
    navigationType === "PUSH" &&
    state?.searchForm === "reset" &&
    previousSearch !== search
  ) {
    setKey(search);
    setPreviousSearch(search);
    return { key, keyChanged: true };
  }
  return { key, keyChanged: false };
};
