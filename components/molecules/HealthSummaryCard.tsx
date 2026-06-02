"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export interface HealthSummaryCardProps {
  label: string;
  value: string;
  percent: number;
}

export function HealthSummaryCard({
  label,
  value,
  percent,
}: HealthSummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}:</span>
          <span className="text-sm font-semibold text-[#2E7D32]">{value}</span>
        </div>
        <Progress
          value={percent}
          aria-label={`${label}: ${percent}%`}
          className="h-1.5"
        />
      </CardContent>
    </Card>
  );
}

export function HealthSummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}
