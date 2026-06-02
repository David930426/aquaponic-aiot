"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
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
import { useAuthStore } from "@/store/useAuthStore";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "operator" | "admin";
  createdAt: string;
}

export default function UsersPage() {
  const { t, dateLocale } = useT();
  const me = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<{ users: UserRow[] }>("/api/users");
      return data.users;
    },
    retry: false,
  });

  if (me && me.role !== "admin") return <ForbiddenNotice />;
  if (error && axios.isAxiosError(error) && error.response?.status === 403)
    return <ForbiddenNotice />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("settings.users.subtitle")}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          {t("settings.users.new")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {t("settings.users.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.users.col.name")}</TableHead>
                  <TableHead>{t("settings.users.col.email")}</TableHead>
                  <TableHead>{t("settings.users.col.role")}</TableHead>
                  <TableHead>{t("settings.users.col.created")}</TableHead>
                  <TableHead className="text-right">
                    {t("settings.users.col.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {u.name}
                          {isSelf && (
                            <Badge className="bg-muted text-[hsl(220_8%_45%)]">
                              {t("settings.users.delete.youBadge")}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.role === "admin"
                              ? "bg-[#E8F5E9] text-[#2E7D32]"
                              : "bg-[#F3F4F6] text-[#6B7280]"
                          }
                        >
                          {t(
                            u.role === "admin"
                              ? "settings.users.role.admin"
                              : "settings.users.role.operator",
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(u.createdAt), "yyyy-MM-dd HH:mm", {
                          locale: dateLocale,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={t("settings.users.actions.menuAria")}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => setEditing(u)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t("settings.users.actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[#B91C1C] focus:bg-[#FEF2F2] focus:text-[#B91C1C]"
                              disabled={isSelf}
                              onClick={() => setDeleting(u)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              {t("settings.users.actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
      />
      <DeleteUserDialog
        user={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ForbiddenNotice() {
  const { t } = useT();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <ShieldAlert className="mb-3 h-10 w-10 text-[#B91C1C]" />
        <p className="text-sm font-medium text-foreground">
          {t("settings.users.forbidden.title")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("settings.users.forbidden.subtitle")}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Create dialog ──────────────────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("settings.users.error.nameRequired")),
        email: z.string().email(t("settings.users.error.emailInvalid")),
        password: z.string().min(8, t("settings.users.error.passwordMin")),
        role: z.enum(["operator", "admin"]),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "operator" },
  });

  const role = watch("role");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post("/api/users", values).then((r) => r.data),
    onSuccess: () => {
      toast.success(t("settings.users.created"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("settings.users.createFailed");
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.users.new")}</DialogTitle>
          <DialogDescription>
            {t("settings.users.newSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="u-name">{t("settings.users.col.name")}</Label>
            <Input id="u-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[#B91C1C]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-email">{t("settings.users.col.email")}</Label>
            <Input id="u-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-[#B91C1C]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-password">
              {t("settings.users.col.password")}
            </Label>
            <Input
              id="u-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-[#B91C1C]">{errors.password.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("settings.users.passwordHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.users.col.role")}</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setValue("role", v as "operator" | "admin", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">
                  {t("settings.users.role.operator")}
                </SelectItem>
                <SelectItem value="admin">
                  {t("settings.users.role.admin")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("settings.users.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("settings.users.creating")
                : t("settings.users.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ────────────────────────────────────────────────────────────

function EditUserDialog({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const open = !!user;

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("settings.users.error.nameRequired")),
        email: z.string().email(t("settings.users.error.emailInvalid")),
        password: z
          .union([
            z.string().length(0),
            z.string().min(8, t("settings.users.error.passwordMin")),
          ])
          .optional(),
        role: z.enum(["operator", "admin"]),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "operator" },
  });

  const role = watch("role");

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
      });
    }
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!user) return Promise.reject(new Error("no user"));
      const payload: Record<string, string> = {
        name: values.name,
        email: values.email,
        role: values.role,
      };
      if (values.password) payload.password = values.password;
      return api.patch(`/api/users/${user.id}`, payload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(t("settings.users.edit.saved"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("settings.users.edit.failed");
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.users.edit.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.users.edit.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="e-name">{t("settings.users.col.name")}</Label>
            <Input id="e-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[#B91C1C]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-email">{t("settings.users.col.email")}</Label>
            <Input id="e-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-[#B91C1C]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-password">
              {t("settings.users.col.password")}
            </Label>
            <Input
              id="e-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-[#B91C1C]">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("settings.users.edit.passwordHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.users.col.role")}</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setValue("role", v as "operator" | "admin", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">
                  {t("settings.users.role.operator")}
                </SelectItem>
                <SelectItem value="admin">
                  {t("settings.users.role.admin")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t("settings.users.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("settings.users.edit.saving")
                : t("settings.users.edit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirmation ────────────────────────────────────────────────────

function DeleteUserDialog({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const open = !!user;

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) return Promise.reject(new Error("no user"));
      return api.delete(`/api/users/${user.id}`).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(t("settings.users.delete.deleted"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("settings.users.delete.failed");
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.users.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.users.delete.confirm", { name: user?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("settings.users.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t("settings.users.delete.deleting")
              : t("settings.users.delete.action")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
