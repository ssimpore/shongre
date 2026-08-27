import React from "react";
import { cn, createVariants } from "../utils/variants";

export type LayoutSpace = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const gapClasses: Record<LayoutSpace, string> = {
  none: "gap-0",
  xs: "gap-1.5",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
};

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "header" | "footer" | "main";
  width?: "task" | "content" | "page" | "workspace" | "full";
  gutter?: "none" | "standard";
}

const containerClasses = createVariants({
  base: "w-full mx-auto min-w-0",
  variants: {
    width: {
      task: "max-w-task",
      content: "max-w-content",
      page: "max-w-page",
      workspace: "max-w-workspace",
      full: "max-w-none",
    },
    gutter: {
      none: "",
      standard: "px-4 sm:px-6 lg:px-8",
    },
  },
  defaultVariants: { width: "page", gutter: "standard" },
});

export const Container: React.FC<ContainerProps> = ({
  as: Component = "div",
  width = "page",
  gutter = "standard",
  className,
  ...props
}) => (
  <Component
    className={containerClasses({ width, gutter, className })}
    {...props}
  />
);

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: LayoutSpace;
  align?: "stretch" | "start" | "center" | "end";
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ gap = "md", align = "stretch", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 flex-col",
        gapClasses[gap],
        {
          stretch: "items-stretch",
          start: "items-start",
          center: "items-center",
          end: "items-end",
        }[align],
        className,
      )}
      {...props}
    />
  ),
);
Stack.displayName = "Stack";

export interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: LayoutSpace;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}

export const Inline = React.forwardRef<HTMLDivElement, InlineProps>(
  (
    {
      gap = "sm",
      align = "center",
      justify = "start",
      wrap = false,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0",
        gapClasses[gap],
        {
          start: "items-start",
          center: "items-center",
          end: "items-end",
          baseline: "items-baseline",
        }[align],
        {
          start: "justify-start",
          center: "justify-center",
          end: "justify-end",
          between: "justify-between",
        }[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  ),
);
Inline.displayName = "Inline";

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | "auto";
  gap?: LayoutSpace;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 1, gap = "md", className, ...props }, ref) => {
    const columnsClass =
      columns === "auto"
        ? "grid-cols-auto-fit-md"
        : {
            1: "grid-cols-1",
            2: "grid-cols-1 sm:grid-cols-2",
            3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          }[columns];
    return (
      <div
        ref={ref}
        className={cn("grid min-w-0", columnsClass, gapClasses[gap], className)}
        {...props}
      />
    );
  },
);
Grid.displayName = "Grid";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "base" | "subtle" | "muted" | "inverse";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "none" | "control" | "panel" | "card" | "overlay";
  elevation?: "none" | "xs" | "sm" | "md" | "dropdown" | "overlay";
  bordered?: boolean;
}

const surfaceClasses = createVariants({
  base: "min-w-0",
  variants: {
    tone: {
      base: "bg-bg-surface text-text-main",
      subtle: "bg-bg-subtle text-text-main",
      muted: "bg-bg-muted text-text-main",
      inverse: "bg-text-main text-text-inverse",
    },
    padding: { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-6" },
    radius: {
      none: "rounded-none",
      control: "rounded-control",
      panel: "rounded-2xl",
      card: "rounded-card",
      overlay: "rounded-overlay",
    },
    elevation: {
      none: "shadow-none",
      xs: "shadow-xs",
      sm: "shadow-sm",
      md: "shadow-md",
      dropdown: "shadow-dropdown",
      overlay: "shadow-overlay",
    },
  },
  defaultVariants: {
    tone: "base",
    padding: "md",
    radius: "panel",
    elevation: "none",
  },
});

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      tone = "base",
      padding = "md",
      radius = "panel",
      elevation = "none",
      bordered = true,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={surfaceClasses({
        tone,
        padding,
        radius,
        elevation,
        className: cn(bordered && "border border-border-base", className),
      })}
      {...props}
    />
  ),
);
Surface.displayName = "Surface";

export const Divider = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("m-0 border-0 border-t border-border-subtle", className)}
    {...props}
  />
));
Divider.displayName = "Divider";
