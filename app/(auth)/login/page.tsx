"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const { data } = await api.post<LoginResponse>("/api/auth/login", values);
      setSession(data);
      toast.success(t("login.welcome", { name: data.user.name }));
      router.push("/dashboard");
    } catch {
      toast.error(t("login.failed"));
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("login.submitting") : t("login.submit")}
      </Button>

      <p className="text-center text-xs text-gray-500">
        {t("login.demoHint")}{" "}
        <code className="rounded bg-muted px-1.5 py-0.5">
          alex@aquawatch.dev
        </code>
        {" / "}
        <code className="rounded bg-muted px-1.5 py-0.5">
          demo1234
        </code>
      </p>
    </form>
  );
}
