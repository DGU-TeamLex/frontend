"use client";
import RequireRole from "../components/RequireRole";
import { Card, PageTitle } from "../components/ui";
import { useAuth } from "../lib/auth-context";

function AdminHome() {
  const { user, logout } = useAuth();
  return (
    <div>
      <PageTitle title="관리자" desc="CENTRAL 역할만 접근 가능한 예시 화면 (역할별 라우팅/관리자 콘솔의 뼈대)." />
      <Card title="내 프로필">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-faint">이메일</dt>
          <dd className="text-ink">{user?.email}</dd>
          <dt className="text-ink-faint">이름</dt>
          <dd className="text-ink">{user?.name}</dd>
          <dt className="text-ink-faint">역할</dt>
          <dd className="text-ink">{user?.role}</dd>
        </dl>
        <button
          onClick={logout}
          className="mt-5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-crit/40 hover:text-crit"
        >
          로그아웃
        </button>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <AdminHome />
    </RequireRole>
  );
}
