"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/admin");
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "登录失败");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage("登录接口暂时不可用");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-md items-center">
      <form onSubmit={login} className="w-full rounded-lg bg-white p-6 shadow-soft">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-ink text-base font-semibold text-white">
          AI
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-normal">后台登录</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">请输入管理员账号密码后继续。</p>

        <label className="mt-6 block">
          <span className="text-sm font-medium">账号</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-3 outline-none transition focus:border-jade"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium">密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-3 outline-none transition focus:border-jade"
          />
        </label>

        {message ? <p className="mt-4 text-sm font-semibold text-red-600">{message}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-jade disabled:cursor-not-allowed disabled:bg-black/30"
        >
          {isSubmitting ? "登录中..." : "登录后台"}
        </button>
      </form>
    </div>
  );
}
