"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Cron } from "croner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CalendarDays,
  CalendarPlus,
  MoreHorizontal,
  Pencil,
  Power,
  Trash2,
  Zap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import {
  buildCron,
  DEFAULT_SPEC,
  humanizeCron,
  parseCron,
  type ScheduleKind,
  type ScheduleSpec,
} from "@/lib/cron-builder";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { useZoneStore } from "@/store/useZoneStore";
import type { ScheduleItem } from "@/types/api";

export default function SchedulesPage() {
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { t, locale, dateLocale } = useT();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [deleting, setDeleting] = useState<ScheduleItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["schedules", zoneId],
    queryFn: async () => {
      const { data } = await api.get<{ schedules: ScheduleItem[] }>(
        "/api/schedules",
        { params: { zoneId } },
      );
      return data.schedules;
    },
    staleTime: 30_000,
  });

  const toggleEnabled = useMutation({
    mutationFn: (s: ScheduleItem) =>
      api
        .patch(`/api/schedules/${s.id}`, { isEnabled: !s.isEnabled })
        .then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["schedules", zoneId] }),
  });

  const fireNow = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/schedules/${id}/fire`).then((r) => r.data),
    onSuccess: () => {
      toast.success(t("schedules.fired"));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-[20px]">
            {t("schedules.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("schedules.page.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="w-full sm:w-auto"
        >
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          {t("schedules.action.new")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.length ? (
            <SchedulesEmpty onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedules.column.name")}</TableHead>
                  <TableHead>{t("schedules.column.frequency")}</TableHead>
                  <TableHead>{t("schedules.column.action")}</TableHead>
                  <TableHead>{t("schedules.column.nextRun")}</TableHead>
                  <TableHead>{t("schedules.column.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("schedules.column.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div>{s.name}</div>
                      {s.description && (
                        <div className="text-xs text-muted-foreground">
                          {s.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {humanizeCron(s.cron, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {s.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.nextRunAt
                        ? format(new Date(s.nextRunAt), "MM/dd HH:mm", {
                            locale: dateLocale,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={s.isEnabled}
                        onCheckedChange={() => toggleEnabled.mutate(s)}
                        disabled={toggleEnabled.isPending}
                        aria-label={t(
                          s.isEnabled
                            ? "schedules.disable"
                            : "schedules.enable",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t("schedules.menuAria")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => fireNow.mutate(s.id)}>
                            <Zap className="mr-2 h-3.5 w-3.5" />
                            {t("schedules.fireNow")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(s)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            {t("schedules.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleEnabled.mutate(s)}
                          >
                            <Power className="mr-2 h-3.5 w-3.5" />
                            {t(
                              s.isEnabled
                                ? "schedules.disable"
                                : "schedules.enable",
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[#B91C1C] focus:bg-[#FEF2F2] focus:text-[#B91C1C]"
                            onClick={() => setDeleting(s)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            {t("schedules.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleFormDialog
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ScheduleFormDialog
        mode="edit"
        schedule={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <DeleteScheduleDialog
        schedule={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function SchedulesEmpty({ onCreate }: { onCreate: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <CalendarDays className="mb-3 h-10 w-10 text-gray-400" />
      <p className="mb-1 text-sm font-medium text-foreground">
        {t("schedules.empty.title")}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        {t("schedules.empty.subtitle")}
      </p>
      <Button size="sm" onClick={onCreate}>
        <CalendarPlus className="mr-1.5 h-4 w-4" />
        {t("schedules.action.new")}
      </Button>
    </div>
  );
}

// ─── Create/Edit dialog ─────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: ScheduleKind; labelKey: MessageKey }[] = [
  { value: "daily", labelKey: "schedules.freq.daily" },
  { value: "weekly", labelKey: "schedules.freq.weekly" },
  { value: "hourly", labelKey: "schedules.freq.hourly" },
  { value: "everyMinutes", labelKey: "schedules.freq.everyMinutes" },
  { value: "monthly", labelKey: "schedules.freq.monthly" },
];

const EVERY_MINUTES_PRESETS = [5, 10, 15, 30] as const;

function ScheduleFormDialog({
  mode,
  schedule,
  open,
  onClose,
}: {
  mode: "create" | "edit";
  schedule?: ScheduleItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale, dateLocale } = useT();
  const queryClient = useQueryClient();
  const zoneId = useZoneStore((s) => s.selectedZoneId);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("schedules.error.nameRequired")),
        description: z.string().optional(),
        action: z.string().min(1, t("schedules.error.actionRequired")),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  // Structured frequency state — kept outside react-hook-form for ergonomics
  const [spec, setSpec] = useState<ScheduleSpec>(DEFAULT_SPEC);

  const defaults: Values = useMemo(
    () => ({
      name: schedule?.name ?? "",
      description: schedule?.description ?? "",
      action: schedule?.action ?? "feed_2g",
    }),
    [schedule],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Re-seed local state when the dialog opens or the target schedule changes.
  // Render-time comparison avoids the extra commit + lint warning from
  // calling setState inside a useEffect, while reset() (RHF's own state)
  // stays in an effect since it isn't React state.
  const openKey = open ? (schedule?.id ?? "new") : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (open && openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setSpec(schedule ? parseCron(schedule.cron) : DEFAULT_SPEC);
  } else if (!open && prevOpenKey !== null) {
    setPrevOpenKey(null);
  }

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const cron = useMemo(() => buildCron(spec), [spec]);
  const humanized = useMemo(() => humanizeCron(cron, locale), [cron, locale]);
  const nextRun = useMemo(() => {
    try {
      const c = new Cron(cron, { paused: true });
      return c.nextRun();
    } catch {
      return null;
    }
  }, [cron]);

  const weekdayError =
    spec.kind === "weekly" && spec.weekdays.length === 0
      ? t("schedules.error.weekdaysRequired")
      : null;

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload = { ...values, cron };
      if (mode === "create") {
        const { data } = await api.post("/api/schedules", {
          ...payload,
          zoneId,
        });
        return data;
      }
      if (!schedule) throw new Error("no schedule");
      const { data } = await api.patch(
        `/api/schedules/${schedule.id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success(
        t(mode === "create" ? "schedules.created" : "schedules.updated"),
      );
      queryClient.invalidateQueries({ queryKey: ["schedules", zoneId] });
      reset(defaults);
      onClose();
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t(
          mode === "create"
            ? "schedules.createFailed"
            : "schedules.updateFailed",
        );
      toast.error(msg);
    },
  });

  const onSubmit = (v: Values) => {
    if (weekdayError) {
      toast.error(weekdayError);
      return;
    }
    mutation.mutate(v);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(
              mode === "create"
                ? "schedules.new.title"
                : "schedules.edit.title",
            )}
          </DialogTitle>
          <DialogDescription>
            {t("schedules.new.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">{t("schedules.field.name")}</Label>
            <Input
              id="s-name"
              placeholder={t("schedules.field.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-[#B91C1C]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-desc">{t("schedules.field.description")}</Label>
            <Input
              id="s-desc"
              placeholder={t("schedules.field.descriptionPlaceholder")}
              {...register("description")}
            />
          </div>

          <FrequencyPicker
            spec={spec}
            onChange={setSpec}
            weekdayError={weekdayError}
          />

          <div className="space-y-1.5">
            <Label htmlFor="s-action">{t("schedules.field.action")}</Label>
            <Input
              id="s-action"
              placeholder="feed_2g"
              {...register("action")}
            />
            {errors.action && (
              <p className="text-xs text-[#B91C1C]">{errors.action.message}</p>
            )}
          </div>

          <div className="rounded-lg border border-[#E4E7EC] bg-[hsl(220_9%_98%)] p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {t("schedules.preview.title")}
            </p>
            <p className="text-foreground">{humanized}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("schedules.preview.nextRun")}:{" "}
              {nextRun
                ? format(nextRun, "yyyy-MM-dd HH:mm", { locale: dateLocale })
                : t("schedules.preview.invalid")}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t("schedules.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !!weekdayError}
            >
              {mutation.isPending
                ? t("schedules.saving")
                : t(mode === "create" ? "schedules.create" : "schedules.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Frequency picker ───────────────────────────────────────────────────────

function FrequencyPicker({
  spec,
  onChange,
  weekdayError,
}: {
  spec: ScheduleSpec;
  onChange: (s: ScheduleSpec) => void;
  weekdayError: string | null;
}) {
  const { t } = useT();

  const setKind = (kind: ScheduleKind) => onChange({ ...spec, kind });
  const setMinute = (minute: number) => onChange({ ...spec, minute });
  const setWeekdays = (weekdays: number[]) =>
    onChange({ ...spec, weekdays });
  const setDayOfMonth = (dayOfMonth: number) =>
    onChange({ ...spec, dayOfMonth });
  const setEveryMinutes = (everyMinutes: number) =>
    onChange({ ...spec, everyMinutes });

  // HH:MM <input type="time">
  const timeValue = `${String(spec.hour).padStart(2, "0")}:${String(
    spec.minute,
  ).padStart(2, "0")}`;
  const onTimeChange = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    // Commit hour AND minute in a single update — separate setHour/setMinute
    // calls would both close over the same stale `spec`, so the second one
    // would clobber the first.
    onChange({
      ...spec,
      hour: Number.isNaN(h) ? spec.hour : Math.max(0, Math.min(23, h)),
      minute: Number.isNaN(m) ? spec.minute : Math.max(0, Math.min(59, m)),
    });
  };

  const toggleWeekday = (d: number) => {
    const next = spec.weekdays.includes(d)
      ? spec.weekdays.filter((x) => x !== d)
      : [...spec.weekdays, d].sort((a, b) => a - b);
    setWeekdays(next);
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#E4E7EC] p-3">
      <div className="space-y-1.5">
        <Label>{t("schedules.freq.label")}</Label>
        <Select
          value={spec.kind === "custom" ? "daily" : spec.kind}
          onValueChange={(v) => setKind(v as ScheduleKind)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQ_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {spec.kind === "everyMinutes" && (
        <div className="space-y-1.5">
          <Label>{t("schedules.field.everyMinutes")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {EVERY_MINUTES_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEveryMinutes(n)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  spec.everyMinutes === n
                    ? "border-[#2E7D32] bg-[#E8F5E9] text-[#2E7D32]"
                    : "border-[#E4E7EC] text-muted-foreground hover:border-[#2E7D32] hover:text-[#2E7D32]",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {spec.kind === "hourly" && (
        <div className="space-y-1.5">
          <Label htmlFor="freq-minute">{t("schedules.field.minute")}</Label>
          <Input
            id="freq-minute"
            type="number"
            min={0}
            max={59}
            value={spec.minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-24"
          />
        </div>
      )}

      {(spec.kind === "daily" ||
        spec.kind === "weekly" ||
        spec.kind === "monthly") && (
        <div className="space-y-1.5">
          <Label htmlFor="freq-time">{t("schedules.field.timeOfDay")}</Label>
          <Input
            id="freq-time"
            type="time"
            step={60}
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-32"
          />
        </div>
      )}

      {spec.kind === "weekly" && (
        <div className="space-y-1.5">
          <Label>{t("schedules.field.weekdays")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const active = spec.weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWeekday(d)}
                  className={cn(
                    "min-w-10 rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-[#2E7D32] bg-[#E8F5E9] text-[#2E7D32]"
                      : "border-[#E4E7EC] text-muted-foreground hover:border-[#2E7D32] hover:text-[#2E7D32]",
                  )}
                >
                  {t(`weekday.short.${d}` as MessageKey)}
                </button>
              );
            })}
          </div>
          {weekdayError && (
            <p className="text-xs text-[#B91C1C]">{weekdayError}</p>
          )}
        </div>
      )}

      {spec.kind === "monthly" && (
        <div className="space-y-1.5">
          <Label htmlFor="freq-dom">{t("schedules.field.dayOfMonth")}</Label>
          <Input
            id="freq-dom"
            type="number"
            min={1}
            max={31}
            value={spec.dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="w-24"
          />
        </div>
      )}
    </div>
  );
}

// ─── Delete confirmation ────────────────────────────────────────────────────

function DeleteScheduleDialog({
  schedule,
  onClose,
}: {
  schedule: ScheduleItem | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const zoneId = useZoneStore((s) => s.selectedZoneId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!schedule) return Promise.reject();
      return api.delete(`/api/schedules/${schedule.id}`).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(t("schedules.deleted"));
      queryClient.invalidateQueries({ queryKey: ["schedules", zoneId] });
      onClose();
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("schedules.deleteFailed");
      toast.error(msg);
    },
  });

  return (
    <Dialog open={!!schedule} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("schedules.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("schedules.delete.confirm", { name: schedule?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("schedules.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t("schedules.delete.deleting")
              : t("schedules.delete.action")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
