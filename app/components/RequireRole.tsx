"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, roleHome, type Role } from "../lib/auth-context";
import { State } from "./ui";

/** roles 를 생략하면 "로그인만 필요"(역할 무관), 지정하면 해당 역할만 통과. */
export default function RequireRole({
  roles,
  children,
}: {
  roles?: Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return <State loading={true} error={null} />;
  }
  return <>{children}</>;
}
