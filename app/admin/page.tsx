"use client";
import { useCallback, useEffect, useState } from "react";
import RequireRole from "../components/RequireRole";
import { Card, PageTitle, Th, Td, State, EmptyState } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { getJSON, sendJSON } from "../lib/api";

// 백엔드 계약: GET/POST/PATCH /users (CENTRAL 전용, backend#25 / PR #28)
type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "CENTRAL" | "INSTITUTION";
  institutionId: string | null;
  institutionName: string | null;
  createdAt: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  CENTRAL: "중앙관리자",
  INSTITUTION: "기관담당자",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("ko-KR");
}

/** 내 프로필 — 기존 화면에서 유지(로그아웃 포함). */
function ProfileCard() {
  const { user, logout } = useAuth();
  return (
    <Card title="내 프로필" className="mb-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-faint">이메일</dt>
        <dd className="text-ink">{user?.email}</dd>
        <dt className="text-ink-faint">이름</dt>
        <dd className="text-ink">{user?.name}</dd>
        <dt className="text-ink-faint">역할</dt>
        <dd className="text-ink">{user?.role && (ROLE_LABEL[user.role] ?? user.role)}</dd>
      </dl>
      <button
        onClick={logout}
        className="mt-5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-crit/40 hover:text-crit"
      >
        로그아웃
      </button>
    </Card>
  );
}

/** 신규 계정 생성 폼. 성공 시 서버가 1회만 노출하는 초기 비밀번호를 표시한다. */
function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CENTRAL" | "INSTITUTION">("INSTITUTION");
  const [institutionId, setInstitutionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; initialPassword: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    setBusy(true);
    try {
      const res = await sendJSON<ManagedUser & { initialPassword: string }>(
        "/users",
        "POST",
        {
          email: email.trim(),
          name: name.trim(),
          role,
          institutionId: role === "INSTITUTION" ? institutionId.trim() || null : null,
        },
      );
      setCreated({ email: res.email, initialPassword: res.initialPassword });
      setEmail("");
      setName("");
      setInstitutionId("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "계정 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="계정 생성" className="mb-6">
      <p className="mb-4 text-xs text-ink-faint">
        공개 회원가입이 없는 서비스라 계정은 여기서만 만들 수 있습니다. 초기 비밀번호는 생성 직후
        <span className="font-semibold text-ink-muted"> 한 번만 </span>
        표시되며 다시 조회할 수 없습니다.
      </p>

      {created && (
        <div className="mb-4 rounded-lg border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-ok">
          <p className="font-bold">계정이 생성되었습니다 — 초기 비밀번호(1회 노출)</p>
          <p className="mt-1.5 text-ok/90">
            <span className="text-ink-muted">{created.email}</span> 의 초기 비밀번호:
          </p>
          <code className="mt-1.5 inline-block rounded-md border border-ok/40 bg-surface px-2.5 py-1 font-mono text-sm text-ink">
            {created.initialPassword}
          </code>
          <p className="mt-1.5 text-xs text-ok/80">
            지금 안전하게 전달하세요. 이 값은 저장/재조회되지 않습니다.
          </p>
        </div>
      )}

      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">이메일</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.go.kr"
            className="w-60 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">이름</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            className="w-40 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">역할</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "CENTRAL" | "INSTITUTION")}
            className="w-40 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="INSTITUTION">기관담당자</option>
            <option value="CENTRAL">중앙관리자</option>
          </select>
        </label>
        {role === "INSTITUTION" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">소속기관 ID</span>
            <input
              required
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              placeholder="예: inst_..."
              className="w-52 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {busy ? "생성 중…" : "계정 생성"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-crit">오류: {error}</p>}
    </Card>
  );
}

/** 계정 목록 + 인라인 역할 변경(PATCH /users/{id}). */
function UserTable({ users, onChanged }: { users: ManagedUser[]; onChanged: () => void }) {
  const { user: me } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function changeRole(u: ManagedUser, nextRole: "CENTRAL" | "INSTITUTION") {
    if (nextRole === u.role) return;
    setRowError(null);
    setSavingId(u.id);
    try {
      // CENTRAL 로 승격 시 소속기관은 불필요, INSTITUTION 로 변경 시 기존 소속기관 유지가 필요하나
      // 여기서는 역할만 변경한다(소속기관 없는 INSTITUTION 은 백엔드가 검증 시 거부할 수 있음).
      await sendJSON(`/users/${u.id}`, "PATCH", { role: nextRole });
      onChanged();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "역할 변경 실패");
    } finally {
      setSavingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="등록된 계정이 없습니다"
        desc="위 폼으로 첫 계정을 생성하세요."
      />
    );
  }

  return (
    <>
      {rowError && <p className="mb-3 text-sm text-crit">오류: {rowError}</p>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <Th>이메일</Th>
              <Th>이름</Th>
              <Th>역할</Th>
              <Th>소속기관</Th>
              <Th>생성일</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const isSelf = me?.id === u.id;
              return (
                <tr key={u.id}>
                  <Td className="font-medium">{u.email}</Td>
                  <Td>{u.name}</Td>
                  <Td>
                    <select
                      value={u.role}
                      disabled={isSelf || savingId === u.id}
                      onChange={(e) =>
                        changeRole(u, e.target.value as "CENTRAL" | "INSTITUTION")
                      }
                      title={isSelf ? "본인 역할은 변경할 수 없습니다." : "역할 변경"}
                      className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-accent disabled:opacity-60"
                    >
                      <option value="INSTITUTION">기관담당자</option>
                      <option value="CENTRAL">중앙관리자</option>
                    </select>
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    {u.institutionName ?? u.institutionId ?? "-"}
                  </Td>
                  <Td className="text-xs text-ink-muted">{fmtDate(u.createdAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminConsole() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getJSON<ManagedUser[]>("/users")
      .then((d) => setUsers(d))
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageTitle
        title="관리자 콘솔"
        desc="CENTRAL 역할 전용. 계정 조회·생성·역할 변경을 수행합니다."
      />

      <ProfileCard />

      <CreateUserForm onCreated={load} />

      <Card
        title={`사용자 관리${users ? ` (${users.length.toLocaleString("ko-KR")}명)` : ""}`}
        className="mb-6"
        action={
          <button
            onClick={load}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            새로고침
          </button>
        }
      >
        {loading && <State loading error={null} />}
        {error && (
          <div className="rounded-lg border border-caution/40 bg-caution-soft px-4 py-3 text-sm text-caution">
            <span className="font-bold">사용자 API를 불러오지 못했습니다</span>
            <span className="ml-1.5 text-caution/90">({error})</span>
            <p className="mt-1.5 text-xs text-caution/80">
              백엔드 사용자 관리 API(GET/POST/PATCH /users, backend#25)가 아직 배포되지 않았을 수
              있습니다. 배포 후 다시 시도해주세요.
            </p>
          </div>
        )}
        {!loading && !error && users && (
          <UserTable users={users} onChanged={load} />
        )}
      </Card>

      <Card title="추가 예정 기능">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
          <li>
            데이터 인테이크 업로드 UI — 백엔드 XLSX 업로드 API(backend#20·#27) 연동 후 제공됩니다.
          </li>
          <li>
            표준화 검수 큐 승인/반려 UI — 백엔드 매칭 엔진(backend#20) 완료 후 제공됩니다.
          </li>
        </ul>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireRole roles={["CENTRAL"]}>
      <AdminConsole />
    </RequireRole>
  );
}
