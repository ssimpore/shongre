import React from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../utils/variants";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className,
}) => (
  <nav
    aria-label="Fil d'Ariane"
    className={cn(
      "flex w-full min-w-0 max-w-full items-center text-xs text-text-muted",
      className,
    )}
  >
    <ol className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-1.5">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li
            key={`${item.label}-${index}`}
            className="flex min-w-0 max-w-full items-center gap-1.5"
          >
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="inline-flex min-h-6 items-center font-medium motion-interactive hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "min-w-0 max-w-full truncate font-bold text-text-main sm:max-w-60"
                    : "font-medium"
                }
                title={isLast ? item.label : undefined}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight
                aria-hidden="true"
                className="h-icon-sm w-icon-sm shrink-0 text-text-disabled"
              />
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
