/** Computes the proper color classes for an <input>, given the input's state. */
export const computeInputColor = ({
  error,
  pending,
}: {
  // There is an error with the input's value.
  error: boolean;
  // The input's value is pending submission.
  pending: boolean;
}) => {
  if (error) {
    return "border-red-500";
  } else if (pending) {
    return "border-yellow-400";
  } else {
    return "border-slate-300 focus-within:border-sky-500";
  }
};
