import { Link as ReactRouterLink, LinkProps } from "@remix-run/react";

export const Link = ({ children, ...props }: LinkProps) => (
  <ReactRouterLink
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...props}
    className="text-cyan-700 hover:underline decoration-1"
  >
    {children}
  </ReactRouterLink>
);
