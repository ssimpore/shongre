import React from "react";
import { Skeleton } from "../../design-system";

export const PageSuspense: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 w-full max-w-7xl mx-auto animate-in fade-in duration-normal">
      {/* Brand Icon Spinner */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-sm">
            S
          </div>
        </div>
        <div className="absolute -inset-1 rounded-3xl border-2 border-primary/30 border-t-transparent animate-spin" />
      </div>

      {/* Text & Skeleton hint */}
      <div className="text-center space-y-2 max-w-xs">
        <Skeleton className="h-4 rounded-full w-32 mx-auto" />
        <Skeleton className="h-3 rounded-full w-48 mx-auto" />
      </div>

      {/* Simulated page skeleton layout */}
      <div className="w-full mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl hidden md:block" />
        <Skeleton className="h-44 rounded-2xl hidden md:block" />
      </div>
    </div>
  );
};
