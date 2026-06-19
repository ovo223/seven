"use client";

import Link from "next/link";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  defaultPlatformState,
  readPlatformState,
  resetPlatformState,
  type PlatformState,
  writePlatformState,
} from "@/lib/platform-state";

export default function AdminPage() {
  const [state, setState] = useState<PlatformState>(defaultPlatformState);
  const [savedText, setSavedText] = useState("");

  useEffect(() => {
    setState(readPlatformState());
  }, []);

  function updateField<Key extends keyof PlatformState>(key: Key, value: PlatformState[Key]) {
    setState((current) => ({ ...current, [key]: value }));
    setSavedText("");
  }

  function save() {
    writePlatformState(state);
    setSavedText("已保存，前台已同步。");
  }

  function reset() {
    resetPlatformState();
    setState(defaultPlatformState);
    setSavedText("已恢复默认配置。");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-jade">后台控制台</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">前台配置</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            当前为本地后台原型。保存后写入浏览器本地存储，前台页面会同步读取。
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-cloud"
        >
          返回前台
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">基础信息</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">品牌名称</span>
                <input
                  value={state.brandName}
                  onChange={(event) => updateField("brandName", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">AI 员工名称</span>
                <input
                  value={state.aiName}
                  onChange={(event) => updateField("aiName", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">头像字母</span>
                <input
                  value={state.aiInitial}
                  maxLength={2}
                  onChange={(event) => updateField("aiInitial", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg bg-cloud px-3 py-3">
                <input
                  type="checkbox"
                  checked={state.isLoggedIn}
                  onChange={(event) => updateField("isLoggedIn", event.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">前台显示为已登录</span>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium">员工简介</span>
              <textarea
                value={state.aiIntro}
                rows={4}
                onChange={(event) => updateField("aiIntro", event.target.value)}
                className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
              />
            </label>
          </div>

          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">钱包与收益</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                label="用户钱包余额"
                value={state.userBalance}
                onChange={(value) => updateField("userBalance", value)}
              />
              <NumberField
                label="AI 员工钱包余额"
                value={state.aiBalance}
                onChange={(value) => updateField("aiBalance", value)}
              />
              <NumberField
                label="当日收益"
                value={state.dailyIncome}
                onChange={(value) => updateField("dailyIncome", value)}
              />
              <NumberField
                label="总收益"
                value={state.totalIncome}
                onChange={(value) => updateField("totalIncome", value)}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">预览摘要</h2>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="登录状态" value={state.isLoggedIn ? "已登录" : "未登录"} />
              <SummaryRow label="用户钱包" value={`¥${state.userBalance.toFixed(2)}`} />
              <SummaryRow label="AI 钱包" value={`¥${state.aiBalance.toFixed(2)}`} />
              <SummaryRow label="总收益" value={`¥${state.totalIncome.toFixed(2)}`} />
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-jade"
          >
            <Save className="h-4 w-4" />
            保存到前台
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-cloud"
          >
            <RotateCcw className="h-4 w-4" />
            恢复默认
          </button>
          {savedText ? <p className="text-center text-sm font-semibold text-jade">{savedText}</p> : null}
        </aside>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/55">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
