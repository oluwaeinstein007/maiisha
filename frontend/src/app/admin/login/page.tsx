import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <Suspense fallback={null}>
        <LoginForm defaultRedirect="/admin" />
      </Suspense>
    </div>
  );
}
