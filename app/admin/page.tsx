"use client";

import Link from "next/link";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  clearWalletOrders,
  defaultPlatformState,
  getWalletOrderStatusLabel,
  getWalletOrderTypeLabel,
  readPlatformState,
  readWalletOrders,
  resetPlatformState,
  type PlatformState,
  type WalletOrder,
  type WalletOrderStatus,
  type WalletOrderType,
  updateWalletOrderStatus,
  walletOrdersEvent,
  writePlatformState,
} from "@/lib/platform-state";

type OrderFilter = "all" | WalletOrderType;

export default function AdminPage() {
  const [state, setState] = useState<PlatformState>(defaultPlatformState);
  const [orders, setOrders] = useState<WalletOrder[]>([]);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [savedText, setSavedText] = useState("");

  useEffect(() => {
    setState(readPlatformState());
    setOrders(readWalletOrders());
    void loadServerState();
    void loadServerOrders();

    function syncOrders(event?: Event) {
      const customEvent = event as CustomEvent<WalletOrder[]>;
      setOrders(customEvent?.detail ?? readWalletOrders());
    }

    function syncStorage(event: StorageEvent) {
      if (event.key === "ai-employee-wallet-orders") {
        setOrders(readWalletOrders());
      }
    }

    window.addEventListener(walletOrdersEvent, syncOrders);
    window.addEventListener("storage", syncStorage);

    return () => {
      window.removeEventListener(walletOrdersEvent, syncOrders);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;

    return orders.filter((order) => order.type === filter);
  }, [filter, orders]);

  const orderSummary = useMemo(() => {
    return {
      rechargeAmount: sumOrders(orders, "recharge"),
      withdrawAmount: sumOrders(orders, "withdraw"),
      fundAmount: sumOrders(orders, "fund_ai"),
      returnAmount: sumOrders(orders, "return_ai"),
      pendingCount: orders.filter((order) => order.status === "pending").length,
    };
  }, [orders]);

  function updateField<Key extends keyof PlatformState>(key: Key, value: PlatformState[Key]) {
    setState((current) => ({ ...current, [key]: value }));
    setSavedText("");
  }

  async function loadServerState() {
    try {
      const response = await fetch("/api/platform-state", { cache: "no-store" });
      const data = (await response.json()) as { state?: PlatformState };

      if (!response.ok || !data.state) return;

      setState(data.state);
      writePlatformState(data.state);
    } catch {
      setState(readPlatformState());
    }
  }

  async function loadServerOrders() {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = (await response.json()) as { orders?: WalletOrder[] };
      setOrders(data.orders ?? []);
    } catch {
      setOrders(readWalletOrders());
    }
  }

  async function save() {
    writePlatformState(state);

    try {
      const response = await fetch("/api/platform-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = (await response.json()) as { state?: PlatformState };

      if (!response.ok || !data.state) throw new Error("State save failed");

      setState(data.state);
      writePlatformState(data.state);
      setSavedText("已保存到服务器，前台已同步。");
    } catch {
      setSavedText("已保存到当前浏览器，服务器同步失败。");
    }
  }

  async function reset() {
    resetPlatformState();
    setState(defaultPlatformState);

    try {
      const response = await fetch("/api/platform-state", { method: "DELETE" });
      const data = (await response.json()) as { state?: PlatformState };

      if (!response.ok || !data.state) throw new Error("State reset failed");

      setState(data.state);
      writePlatformState(data.state);
      setSavedText("已恢复默认配置并同步到服务器。");
    } catch {
      setSavedText("已恢复当前浏览器默认配置，服务器同步失败。");
    }
  }

  async function changeOrderStatus(orderId: string, status: WalletOrderStatus) {
    updateWalletOrderStatus(orderId, status);

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });

      if (!response.ok) throw new Error("Order update failed");
      await loadServerOrders();
    } catch {
      setOrders(readWalletOrders());
    }
  }

  async function clearOrders() {
    clearWalletOrders();

    try {
      await fetch("/api/orders", { method: "DELETE" });
      await loadServerOrders();
    } catch {
      setOrders([]);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-jade">后台控制台</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">运营后台</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            管理前台展示、钱包余额，并查看充值、提现、拨款和取回订单。
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-cloud"
        >
          返回前台
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="充值总额" value={`¥${orderSummary.rechargeAmount.toFixed(2)}`} />
        <MetricCard label="提现总额" value={`¥${orderSummary.withdrawAmount.toFixed(2)}`} />
        <MetricCard label="AI 拨款" value={`¥${orderSummary.fundAmount.toFixed(2)}`} />
        <MetricCard label="AI 取回" value={`¥${orderSummary.returnAmount.toFixed(2)}`} />
        <MetricCard label="待处理订单" value={`${orderSummary.pendingCount}`} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">基础信息</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="品牌名称"
                value={state.brandName}
                onChange={(value) => updateField("brandName", value)}
              />
              <TextField
                label="AI 员工名称"
                value={state.aiName}
                onChange={(value) => updateField("aiName", value)}
              />
              <TextField
                label="头像字母"
                value={state.aiInitial}
                maxLength={2}
                onChange={(value) => updateField("aiInitial", value)}
              />
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

          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">钱包订单</h2>
                <p className="mt-1 text-sm text-ink/55">查看充值、提现、拨款和取回记录。</p>
              </div>
              <button
                type="button"
                onClick={clearOrders}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-cloud"
              >
                <Trash2 className="h-4 w-4" />
                清空记录
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["all", "全部"],
                ["recharge", "充值"],
                ["withdraw", "提现"],
                ["fund_ai", "拨款"],
                ["return_ai", "取回"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as OrderFilter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-ink text-white"
                      : "border border-black/10 bg-white text-ink hover:bg-cloud"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-ink/55">
                    <th className="py-3 pr-4 font-medium">订单号</th>
                    <th className="py-3 pr-4 font-medium">类型</th>
                    <th className="py-3 pr-4 font-medium">金额</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">用户余额</th>
                    <th className="py-3 pr-4 font-medium">AI 余额</th>
                    <th className="py-3 pr-4 font-medium">时间</th>
                    <th className="py-3 pr-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-black/5">
                        <td className="py-3 pr-4 font-mono text-xs">{order.id}</td>
                        <td className="py-3 pr-4">{getWalletOrderTypeLabel(order.type)}</td>
                        <td className="py-3 pr-4 font-semibold">¥{order.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-3 pr-4">¥{order.userBalanceAfter.toFixed(2)}</td>
                        <td className="py-3 pr-4">¥{order.aiBalanceAfter.toFixed(2)}</td>
                        <td className="py-3 pr-4">{formatTime(order.createdAt)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => changeOrderStatus(order.id, "success")}
                              className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-jade"
                            >
                              完成
                            </button>
                            <button
                              type="button"
                              onClick={() => changeOrderStatus(order.id, "failed")}
                              className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                            >
                              拒绝
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-8 text-center text-ink/50" colSpan={8}>
                        暂无订单记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

function sumOrders(orders: WalletOrder[], type: WalletOrderType) {
  return orders
    .filter((order) => order.type === type && order.status === "success")
    .reduce((sum, order) => sum + order.amount, 0);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-soft">
      <div className="text-sm text-ink/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: WalletOrderStatus }) {
  const className =
    status === "success"
      ? "bg-mint text-jade"
      : status === "failed"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {getWalletOrderStatusLabel(status)}
    </span>
  );
}

function TextField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
      />
    </label>
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
