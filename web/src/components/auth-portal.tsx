"use client";

import { useState, type FormEvent } from "react";
import { ImageIcon, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";

export function AuthPortal({ mode }: { mode: "setup" | "login" }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setup = mode === "setup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (setup && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(setup ? "/api/setup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "操作失败");
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败，请重试");
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute -left-20 top-12 h-72 w-72 rounded-full bg-[#d7ff45]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      <section className="glass float-in relative w-full max-w-md overflow-hidden rounded-[2rem] p-7 sm:p-9" aria-labelledby="auth-title">
        <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55">
          <LockKeyhole size={12} /> 私人空间
        </div>
        <div className="mb-10 flex items-center gap-3">
          <span className="grid h-11 w-11 rotate-[-6deg] place-items-center rounded-2xl bg-[#d7ff45] text-black shadow-[0_0_35px_rgba(215,255,69,.2)]">
            <ImageIcon size={22} strokeWidth={2.4} />
          </span>
          <div>
            <div className="text-lg font-black tracking-tight">神图集</div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/35">Divine Gallery</div>
          </div>
        </div>

        <Sparkles className="mb-3 text-[#d7ff45]" size={24} aria-hidden="true" />
        <h1 id="auth-title" className="text-3xl font-black tracking-[-0.04em]">
          {setup ? "先给图库上把锁" : "欢迎回来"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/50">
          {setup
            ? "设置唯一的管理员密码。图片和关键字只保存在你的设备上。"
            : "输入管理员密码，继续翻看那些值得收藏的神图。"}
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-white/60">管理员密码</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white placeholder:text-white/20 focus:border-[#d7ff45]/60"
              type="password"
              autoComplete={setup ? "new-password" : "current-password"}
              minLength={10}
              maxLength={256}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 10 个字符"
            />
          </label>
          {setup && (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-white/60">确认密码</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white placeholder:text-white/20 focus:border-[#d7ff45]/60"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={256}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再输入一次"
              />
            </label>
          )}
          <div className="min-h-6 text-sm text-[#ff8b73]" role="alert">
            {error}
          </div>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3.5 font-black text-[#15170f] transition hover:bg-[#e2ff76] disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading && <LoaderCircle className="animate-spin" size={18} />}
            {setup ? "创建我的神图集" : "进入神图集"}
          </button>
        </form>
      </section>
    </main>
  );
}
