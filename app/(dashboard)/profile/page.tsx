"use client";

import { useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import type { AuthUser } from "@/types/api";

export default function ProfilePage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const setStoreUser = useAuthStore((s) => s.setUser);
  const bumpAvatarVersion = useAuthStore((s) => s.bumpAvatarVersion);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
      return data.user;
    },
    staleTime: 60_000,
  });

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-225 space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-225 space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("profile.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("profile.page.subtitle")}
        </p>
      </div>

      <PhotoSection
        user={user}
        onChanged={() => {
          bumpAvatarVersion();
          queryClient.invalidateQueries({ queryKey: ["me"] });
        }}
      />

      <IdentitySection
        user={user}
        onSaved={(next) => {
          setStoreUser(next);
          queryClient.invalidateQueries({ queryKey: ["me"] });
        }}
      />

      <PasswordSection />
    </div>
  );
}

// ─── Avatar upload ──────────────────────────────────────────────────────────

function PhotoSection({
  user,
  onChanged,
}: {
  user: AuthUser;
  onChanged: () => void;
}) {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Cache-bust the avatar URL so a fresh upload appears immediately.
  const [avatarVersion, setAvatarVersion] = useState<number>(() => Date.now());
  const avatarSrc = `/api/profile/avatar/${user.id}?v=${avatarVersion}`;

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ avatarUrl: string }>(
        "/api/profile/avatar",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => {
      setAvatarVersion(Date.now());
      toast.success(t("profile.success.photoUploaded"));
      onChanged();
    },
    onError: (err) => {
      const data = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string; message?: string } | undefined)
        : undefined;
      const code = data?.error;
      const key =
        code === "UNSUPPORTED_TYPE"
          ? "profile.error.unsupportedType"
          : code === "TOO_LARGE"
            ? "profile.error.tooLarge"
            : code === "STORAGE_UNCONFIGURED"
              ? "profile.error.storageDisabled"
              : "profile.error.uploadFailed";
      toast.error(t(key));
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete("/api/profile/avatar");
    },
    onSuccess: () => {
      setAvatarVersion(Date.now());
      toast.success(t("profile.success.photoRemoved"));
      onChanged();
    },
    onError: () => toast.error(t("profile.error.uploadFailed")),
  });

  const pickFile = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file);
    e.target.value = ""; // allow picking the same file twice in a row
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            {t("profile.section.photo")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("profile.section.photo.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarSrc} alt={user.name} />
            <AvatarFallback className="bg-[#E8F5E9] text-lg text-[#2E7D32]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={onFileChange}
            />
            <Button
              onClick={pickFile}
              disabled={upload.isPending || remove.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {upload.isPending
                ? t("profile.action.uploading")
                : t("profile.action.upload")}
            </Button>
            <Button
              variant="outline"
              onClick={() => remove.mutate()}
              disabled={upload.isPending || remove.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("profile.action.removePhoto")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Identity (name + email) ────────────────────────────────────────────────

function IdentitySection({
  user,
  onSaved,
}: {
  user: AuthUser;
  onSaved: (next: AuthUser) => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");

  // Reset locals when the upstream user prop changes (after save, after
  // initial load). Render-time comparison instead of useEffect.
  const [prevUserId, setPrevUserId] = useState(user.id);
  if (user.id !== prevUserId) {
    setPrevUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setCurrentPassword("");
  }

  const emailChanged = email !== user.email;
  const dirty = name !== user.name || emailChanged;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (name !== user.name) payload.name = name;
      if (emailChanged) {
        payload.email = email;
        payload.currentPassword = currentPassword;
      }
      const { data } = await api.patch<{ user: AuthUser }>(
        "/api/profile",
        payload,
      );
      return data.user;
    },
    onSuccess: (next) => {
      toast.success(t("profile.success.saved"));
      setCurrentPassword("");
      onSaved(next);
    },
    onError: (err) => {
      const code =
        (axios.isAxiosError(err) &&
          (err.response?.data as { error?: string } | undefined)?.error) ||
        "";
      const key =
        code === "INVALID_PASSWORD"
          ? "profile.error.currentPassword"
          : code === "EMAIL_TAKEN"
            ? "profile.error.emailTaken"
            : code === "PASSWORD_REQUIRED"
              ? "profile.error.passwordRequired"
              : "profile.error.saveFailed";
      toast.error(t(key));
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            {t("profile.section.identity")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("profile.section.identity.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t("profile.field.name")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("profile.field.email")}</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("profile.field.role")}</Label>
            <p className="rounded-md border border-[#E4E7EC] bg-muted px-3 py-2 text-sm text-muted-foreground">
              {user.role}
            </p>
          </div>
        </div>

        {emailChanged && (
          <div className="space-y-1.5">
            <Label htmlFor="profile-cp-email">
              {t("profile.field.currentPasswordForEmail")}
            </Label>
            <Input
              id="profile-cp-email"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !dirty ||
              !name.trim() ||
              (emailChanged && !currentPassword)
            }
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {mutation.isPending
              ? t("profile.action.saving")
              : t("profile.action.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Password change ────────────────────────────────────────────────────────

function PasswordSection() {
  const { t } = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/profile/password", {
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      toast.success(t("profile.success.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      const code =
        (axios.isAxiosError(err) &&
          (err.response?.data as { error?: string } | undefined)?.error) ||
        "";
      const key =
        code === "INVALID_PASSWORD"
          ? "profile.error.currentPassword"
          : code === "SAME_PASSWORD"
            ? "profile.error.same"
            : "profile.error.passwordChangeFailed";
      toast.error(t(key));
    },
  });

  const lengthOk = newPassword.length >= 8;
  const matchOk = newPassword === confirmPassword;
  const canSubmit =
    !mutation.isPending && currentPassword && lengthOk && matchOk;

  const onSubmit = () => {
    if (!lengthOk) {
      toast.error(t("profile.error.passwordMin"));
      return;
    }
    if (!matchOk) {
      toast.error(t("profile.error.passwordsDoNotMatch"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">
            {t("profile.section.password")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("profile.section.password.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-current">
              {t("profile.field.currentPassword")}
            </Label>
            <Input
              id="profile-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-new">{t("profile.field.newPassword")}</Label>
            <Input
              id="profile-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm">
              {t("profile.field.confirmPassword")}
            </Label>
            <Input
              id="profile-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {mutation.isPending
              ? t("profile.action.saving")
              : t("profile.action.changePassword")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
