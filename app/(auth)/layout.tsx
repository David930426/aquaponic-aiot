import { Leaf } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-4">
      <div className="w-full max-w-90">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E7D32]">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">AquaWatch</h1>
          <p className="mt-0.5 text-sm text-gray-500">Device Management</p>
        </div>
        <Card className="shadow-(--shadow-panel)">
          <CardContent className="p-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
