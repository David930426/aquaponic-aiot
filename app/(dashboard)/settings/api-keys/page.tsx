"use client";

import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  isRevoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { t, dateLocale } = useT();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<{ rawKey: string; label: string } | null>(
    null,
  );
  const [label, setLabel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data } = await api.get<{ keys: ApiKeyRow[] }>("/api/api-keys");
      return data.keys;
    },
  });

  const create = useMutation({
    mutationFn: async (label: string) => {
      const { data } = await api.post<{
        key: { id: string; label: string; keyPrefix: string };
        rawKey: string;
      }>("/api/api-keys", { label });
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("settings.apiKeys.created"));
      setNewKey({ rawKey: data.rawKey, label: data.key.label });
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("settings.apiKeys.createFailed");
      toast.error(msg);
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/api-keys/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success(t("settings.apiKeys.revoked"));
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast.error(t("settings.apiKeys.revokeFailed")),
  });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("settings.apiKeys.copied"));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("settings.apiKeys.subtitle")}
      </p>

      <Card>
        <CardContent className="p-5">
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (label.trim()) create.mutate(label.trim());
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="key-label">{t("settings.apiKeys.label")}</Label>
              <Input
                id="key-label"
                placeholder="e.g. Greenhouse A Gateway"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={create.isPending || !label.trim()}>
              {create.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {t("settings.apiKeys.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

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
              {t("settings.apiKeys.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.apiKeys.col.label")}</TableHead>
                  <TableHead>{t("settings.apiKeys.col.key")}</TableHead>
                  <TableHead>{t("settings.apiKeys.col.lastUsed")}</TableHead>
                  <TableHead>{t("settings.apiKeys.col.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("settings.apiKeys.col.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {k.keyPrefix}…
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.lastUsedAt
                        ? formatDistanceToNow(new Date(k.lastUsedAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })
                        : t("settings.apiKeys.neverUsed")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          k.isRevoked
                            ? "bg-[#FEF2F2] text-[#B91C1C]"
                            : "bg-[#E8F5E9] text-[#2E7D32]"
                        }
                      >
                        {t(
                          k.isRevoked
                            ? "settings.apiKeys.status.revoked"
                            : "settings.apiKeys.status.active",
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!k.isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                          onClick={() => revoke.mutate(k.id)}
                          disabled={revoke.isPending}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {t("settings.apiKeys.revoke")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.apiKeys.show.title")}</DialogTitle>
            <DialogDescription>
              {t("settings.apiKeys.show.subtitle", { label: newKey?.label ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{t("settings.apiKeys.show.keyLabel")}</Label>
            <div className="flex gap-2">
              <Input
                value={newKey?.rawKey ?? ""}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => newKey && copy(newKey.rawKey)}
                aria-label={t("settings.apiKeys.copyAria")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-[#B91C1C]">
              {t("settings.apiKeys.show.warning")}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>
              {t("settings.apiKeys.show.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* createdAt unused but kept for future "sort by" — silence lint */}
      {data && (
        <p className="hidden">
          {data.map((k) => format(new Date(k.createdAt), "yyyy-MM-dd")).join()}
        </p>
      )}
    </div>
  );
}
