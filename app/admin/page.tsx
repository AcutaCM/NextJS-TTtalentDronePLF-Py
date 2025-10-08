"use client";

import React, { useEffect, useMemo, useState } from "react";

type UserRole = "admin" | "normal";
type UserRecord = { email: string; role: UserRole };

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ email: string; role: UserRole } | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [hasAdmin, setHasAdmin] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<UserRole>("normal");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const isAdmin = useMemo(() => me?.role === "admin", [me]);

  async function refreshMe() {
    try {
      const r = await fetch("/api/auth/current");
      const d = await r.json();
      setMe({ email: String(d?.email || ""), role: (d?.role === "admin" ? "admin" : "normal") });
    } catch {
      setMe({ email: "", role: "normal" });
    }
  }

  async function refreshUsers() {
    try {
      const r = await fetch("/api/admin/users/list");
      if (!r.ok) {
        setUsers([]);
        setHasAdmin(false);
        return;
      }
      const d = await r.json();
      setUsers(Array.isArray(d?.users) ? d.users : []);
      setHasAdmin(!!d?.hasAdmin);
    } catch {
      setUsers([]);
      setHasAdmin(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshMe();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      refreshUsers();
    }
  }, [isAdmin]);

  async function handleLogin(email: string) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(`登录失败：${d?.error || r.status}`);
      } else {
        setMsg(`已登录：${d.email}（角色：${d.role}）`);
        await refreshMe();
        if (d.role === "admin") await refreshUsers();
      }
    } catch (e: any) {
      setMsg(`登录异常：${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleBootstrapAdmin(email: string) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(`引导失败：${d?.error || r.status}`);
      } else {
        setMsg(`已设为管理员：${d.email}`);
        // 完成后建议用该邮箱登录以获取管理员权限
      }
    } catch (e: any) {
      setMsg(`引导异常：${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSetRole(email: string, role: UserRole) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role })
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg(`设置失败：${d?.error || r.status}`);
      } else {
        setMsg(`已设置 ${email} 为 ${role}`);
        await refreshUsers();
      }
    } catch (e: any) {
      setMsg(`设置异常：${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>管理员后台</h1>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <section style={{ marginBottom: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>当前登录</h2>
            <div>邮箱：{me?.email || "-"}</div>
            <div>角色：{me?.role}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input
                placeholder="输入邮箱登录"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6, flex: 1 }}
              />
              <button
                onClick={() => handleLogin(emailInput)}
                disabled={busy || !emailInput}
                style={{ padding: "6px 12px" }}
              >
                登录该邮箱
              </button>
            </div>
            {!hasAdmin && (
              <div style={{ marginTop: 10, padding: 10, background: "#fffbea", border: "1px solid #fde68a", borderRadius: 6 }}>
                <div style={{ marginBottom: 6 }}>系统尚无管理员，可执行一次性引导：</div>
                <button
                  onClick={() => handleBootstrapAdmin(emailInput)}
                  disabled={busy || !emailInput}
                  style={{ padding: "6px 12px" }}
                >
                  引导设为管理员
                </button>
              </div>
            )}
          </section>

          {!isAdmin ? (
            <div style={{ padding: 12, border: "1px solid #fee2e2", background: "#fef2f2", borderRadius: 8 }}>
              你不是管理员。如需管理，请使用管理员邮箱登录，或在尚无管理员时使用“引导设为管理员”。
            </div>
          ) : (
            <>
              <section style={{ marginBottom: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>设置用户角色</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="目标邮箱"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6, flex: 1 }}
                  />
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as UserRole)}
                    style={{ padding: 6, border: "1px solid #ccc", borderRadius: 6 }}
                  >
                    <option value="normal">normal</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    onClick={() => handleSetRole(emailInput, roleInput)}
                    disabled={busy || !emailInput}
                    style={{ padding: "6px 12px" }}
                  >
                    保存角色
                  </button>
                </div>
              </section>

              <section style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>用户列表</h2>
                {users.length === 0 ? (
                  <div>暂无记录</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>邮箱</th>
                        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>角色</th>
                        <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.email}>
                          <td style={{ borderBottom: "1px solid #f1f1f1", padding: 6 }}>{u.email}</td>
                          <td style={{ borderBottom: "1px solid #f1f1f1", padding: 6 }}>{u.role}</td>
                          <td style={{ borderBottom: "1px solid #f1f1f1", padding: 6 }}>
                            <button
                              onClick={() => handleSetRole(u.email, u.role === "admin" ? "normal" : "admin")}
                              disabled={busy}
                              style={{ padding: "4px 10px" }}
                            >
                              设为{u.role === "admin" ? "normal" : "admin"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {msg && (
            <div style={{ marginTop: 12, color: "#374151" }}>
              {msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}