import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[hsl(220_9%_92%)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
