import React from "react";

interface HomeSectionHeadingProps {
  children: React.ReactNode;
  id?: string;
}

/** Canonical heading treatment for every primary homepage section. */
export const HomeSectionHeading: React.FC<HomeSectionHeadingProps> = ({
  children,
  id,
}) => (
  <h2
    id={id}
    className="text-xl font-bold tracking-tight text-text-main sm:text-3xl"
  >
    {children}
  </h2>
);
