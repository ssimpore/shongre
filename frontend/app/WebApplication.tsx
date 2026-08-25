"use client";

import App from "../src/App";

export function WebApplication({ pathname }: { pathname: string }) {
  return <App initialPath={pathname} />;
}
