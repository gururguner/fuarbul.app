import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type MainContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function MainContainer({ children, className }: MainContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
