"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import type { LoginResponse } from "@/types/api";

function isSafeNext(value: string | null): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/login")
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-40" aria-hidden />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const { t } = useT();

  const LoginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("login.error.email")),
        password: z.string().min(1, t("login.error.password")),
      }),
    [t],
  );

  type LoginValues = z.infer<typeof LoginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "alex@aquawatch.dev", password: "demo1234" },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    try {
      const { data } = await api.post<LoginResponse>("/api/auth/login", {
        ...values,
        remember,
      });
      setUser(data.user);
      toast.success(t("login.welcome", { name: data.user.name }));
      const next = searchParams.get("next");
      router.push(isSafeNext(next) ? next : "/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        const body = err.response.data as {
          retryAfterSec?: number;
          error?: string;
        };
        const seconds = body.retryAfterSec ?? 60;
        const key =
          body.error === "RATE_LIMITED" &&
          /locked/i.test((body as { message?: string }).message ?? "")
            ? "login.lockedOut"
            : "login.rateLimited";
        toast.error(t(key, { seconds }));
      } else {
        toast.error(t("login.failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("login.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-[#B91C1C]">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-[#B91C1C]">{errors.password.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[#2E7D32]"
        />
        {t("login.rememberMe")}
      </label>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("login.submitting") : t("login.submit")}
      </Button>

      <p className="text-center text-xs text-gray-500">
        {t("login.demoHint")}{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">
          alex@aquawatch.dev
        </code>
        {" / "}
        <code className="rounded bg-muted px-1.5 py-0.5">demo1234</code>
      </p>
    </form>
  );
}
