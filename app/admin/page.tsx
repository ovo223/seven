"use client";

import { KeyRound, Lock, RotateCcw, Save, Trash2, Unlock } from "lucide-react";
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
  walletOrdersEvent,
  writePlatformState,
  writeWalletOrders,
} from "@/lib/platform-state";

type OrderFilter = "all" | WalletOrderType;
type AdminView = "dashboard" | "users" | "orders" | "integrations";

type IntegrationConfig = {
  aiChat: {
    enabled: boolean;
    provider: "mock" | "openai" | "deepseek" | "qwen" | "custom";
    apiUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
  };
  recharge: {
    enabled: boolean;
    provider: "manual" | "wechat_pay" | "alipay" | "stripe" | "bank_transfer" | "custom";
    apiUrl: string;
    merchantId: string;
    apiKey: string;
    instructions: string;
  };
  withdraw: {
    enabled: boolean;
    provider: "manual" | "wechat_pay" | "alipay" | "stripe" | "bank_transfer" | "custom";
    apiUrl: string;
    merchantId: string;
    apiKey: string;
    instructions: string;
  };
};

type UserSummary = {
  email: string;
  orderCount: number;
  rechargeAmount: number;
  withdrawAmount: number;
  fundAmount: number;
  returnAmount: number;
  pendingCount: number;
  userBalance: number;
  aiBalance: number;
  latestOrderAt: string;
};

type AdminUserProfile = {
  email: string;
  password: string;
  status: "active" | "frozen";
  createdAt: string;
  lastLoginAt: string;
  loginRecords: string[];
};

const defaultIntegrationConfig: IntegrationConfig = {
  aiChat: {
    enabled: false,
    provider: "mock",
    apiUrl: "",
    apiKey: "",
    model: "",
    systemPrompt: "",
  },
  recharge: {
    enabled: true,
    provider: "manual",
    apiUrl: "",
    merchantId: "",
    apiKey: "",
    instructions: "请提交充值订单，后台审核通过后到账。",
  },
  withdraw: {
    enabled: true,
    provider: "manual",
    apiUrl: "",
    merchantId: "",
    apiKey: "",
    instructions: "请提交提现订单，后台审核通过后处理。",
  },
};

export default function AdminPage() {
  const [state, setState] = useState<PlatformState>(defaultPlatformState);
  const [orders, setOrders] = useState<WalletOrder[]>([]);
  const [view, setView] = useState<AdminView>("dashboard");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userActionText, setUserActionText] = useState("");
  const [integrationConfig, setIntegrationConfig] =
    useState<IntegrationConfig>(defaultIntegrationConfig);
  const [savedText, setSavedText] = useState("");

  useEffect(() => {
    setState(readPlatformState());
    setOrders(readWalletOrders());
    void loadServerState();
    void loadServerOrders();
    void loadUsers();
    void loadIntegrations();

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

  const allUserSummaries = useMemo(() => buildUserSummaries(orders, "", users), [orders, users]);
  const userSummaries = useMemo(
    () => buildUserSummaries(orders, userQuery, users),
    [orders, userQuery, users],
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.email === selectedUserEmail),
    [selectedUserEmail, users],
  );
  const selectedUserSummary = useMemo(
    () => allUserSummaries.find((user) => user.email === selectedUserEmail),
    [allUserSummaries, selectedUserEmail],
  );
  const filteredUserOrders = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) => order.userEmail?.toLowerCase().includes(query));
  }, [orders, userQuery]);

  const platformSummary = useMemo(() => {
    return allUserSummaries.reduce(
      (summary, user) => ({
        onlineUsers: summary.onlineUsers + 1,
        userBalance: summary.userBalance + user.userBalance,
        aiBalance: summary.aiBalance + user.aiBalance,
      }),
      { onlineUsers: 0, userBalance: 0, aiBalance: 0 },
    );
  }, [allUserSummaries]);

  const orderSummary = useMemo(() => {
    return {
      rechargeAmount: sumOrders(orders, "recharge"),
      withdrawAmount: sumOrders(orders, "withdraw"),
      fundAmount: sumOrders(orders, "fund_ai"),
      returnAmount: sumOrders(orders, "return_ai"),
      pendingCount: orders.filter(
        (order) =>
          order.status === "pending" && (order.type === "recharge" || order.type === "withdraw"),
      ).length,
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
      const nextOrders = data.orders ?? [];

      setOrders(nextOrders);
      writeWalletOrders(nextOrders);
    } catch {
      setOrders(readWalletOrders());
    }
  }

  async function loadIntegrations() {
    try {
      const response = await fetch("/api/admin/integrations", { cache: "no-store" });
      const data = (await response.json()) as { config?: IntegrationConfig };

      if (!response.ok || !data.config) return;

      setIntegrationConfig(data.config);
    } catch {
      setIntegrationConfig(defaultIntegrationConfig);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await response.json()) as { users?: AdminUserProfile[] };

      if (!response.ok || !data.users) return;

      setUsers(data.users);
    } catch {
      setUsers([]);
    }
  }

  async function updateSelectedUser(patch: Partial<Pick<AdminUserProfile, "status" | "password">>) {
    if (!selectedUserEmail) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedUserEmail, ...patch }),
      });
      const data = (await response.json()) as { user?: AdminUserProfile; message?: string };

      if (!response.ok || !data.user) throw new Error(data.message ?? "User update failed");

      setUsers((current) =>
        current.map((user) => (user.email === data.user?.email ? data.user : user)),
      );
      setUserActionText("用户资料已更新。");
      setNewUserPassword("");
    } catch {
      setUserActionText("用户资料更新失败，请稍后再试。");
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

  async function saveIntegrations() {
    try {
      const response = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: integrationConfig }),
      });
      const data = (await response.json()) as { config?: IntegrationConfig };

      if (!response.ok || !data.config) throw new Error("Integration save failed");

      setIntegrationConfig(data.config);
      setSavedText("接口配置已保存。");
    } catch {
      setSavedText("接口配置保存失败，请稍后再试。");
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
    setOrders((current) => {
      const source = current.length ? current : readWalletOrders();
      const nextOrders = source.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      );

      writeWalletOrders(nextOrders);
      return nextOrders;
    });

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });

      if (!response.ok) throw new Error("Order update failed");
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
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-lg bg-white p-2 shadow-soft">
        <button
          type="button"
          onClick={() => setView("dashboard")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "dashboard" ? "bg-ink text-white" : "text-ink hover:bg-cloud"
          }`}
        >
          后台首页
        </button>
        <button
          type="button"
          onClick={() => setView("users")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "users" ? "bg-ink text-white" : "text-ink hover:bg-cloud"
          }`}
        >
          用户查询
        </button>
        <button
          type="button"
          onClick={() => setView("orders")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "orders" ? "bg-ink text-white" : "text-ink hover:bg-cloud"
          }`}
        >
          钱包订单
        </button>
        <button
          type="button"
          onClick={() => setView("integrations")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            view === "integrations" ? "bg-ink text-white" : "text-ink hover:bg-cloud"
          }`}
        >
          接口配置
        </button>
      </div>

      {view === "dashboard" ? (
        <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="全平台充值总额" value={`¥${orderSummary.rechargeAmount.toFixed(2)}`} />
        <MetricCard label="全平台提现总额" value={`¥${orderSummary.withdrawAmount.toFixed(2)}`} />
        <MetricCard label="全平台 AI 拨款" value={`¥${orderSummary.fundAmount.toFixed(2)}`} />
        <MetricCard label="全平台 AI 取回" value={`¥${orderSummary.returnAmount.toFixed(2)}`} />
        <MetricCard label="待处理订单" value={`${orderSummary.pendingCount}`} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">全平台钱包与收益</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ReadOnlyMetric label="用户钱包总额" value={`¥${platformSummary.userBalance.toFixed(2)}`} />
              <ReadOnlyMetric label="AI 钱包总额" value={`¥${platformSummary.aiBalance.toFixed(2)}`} />
              <ReadOnlyMetric label="当日收益" value={`¥${state.dailyIncome.toFixed(2)}`} />
              <ReadOnlyMetric label="总收益" value={`¥${state.totalIncome.toFixed(2)}`} />
            </div>
          </div>

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

        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">预览摘要</h2>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="在线人数" value={`${platformSummary.onlineUsers}`} />
              <SummaryRow label="用户钱包总额" value={`¥${platformSummary.userBalance.toFixed(2)}`} />
              <SummaryRow label="AI 钱包总额" value={`¥${platformSummary.aiBalance.toFixed(2)}`} />
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
        </>
      ) : view === "orders" ? (
        <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
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
                  <th className="py-3 pr-4 font-medium">用户</th>
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
                      <td className="py-3 pr-4">{order.userEmail ?? "-"}</td>
                      <td className="py-3 pr-4">{getWalletOrderTypeLabel(order.type)}</td>
                      <td className="py-3 pr-4 font-semibold">¥{order.amount.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 pr-4">¥{order.userBalanceAfter.toFixed(2)}</td>
                      <td className="py-3 pr-4">¥{order.aiBalanceAfter.toFixed(2)}</td>
                      <td className="py-3 pr-4">{formatTime(order.createdAt)}</td>
                      <td className="py-3 pr-4">
                        {needsReview(order) ? (
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
                        ) : (
                          <span className="text-xs font-semibold text-ink/45">
                            {order.type === "fund_ai" || order.type === "return_ai"
                              ? "无需审核"
                              : "已处理"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-8 text-center text-ink/50" colSpan={9}>
                      暂无订单记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : view === "integrations" ? (
        <div className="space-y-5">
          <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">AI 聊天接口</h2>
                <p className="mt-1 text-sm text-ink/55">
                  配置后，前台聊天会优先调用这里的服务端接口。
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={integrationConfig.aiChat.enabled}
                  onChange={(event) =>
                    setIntegrationConfig((current) => ({
                      ...current,
                      aiChat: { ...current.aiChat, enabled: event.target.checked },
                    }))
                  }
                />
                启用
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="接口类型"
                value={integrationConfig.aiChat.provider}
                options={[
                  ["mock", "模拟接口"],
                  ["openai", "OpenAI"],
                  ["deepseek", "DeepSeek"],
                  ["qwen", "通义千问"],
                  ["custom", "自定义"],
                ]}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    aiChat: {
                      ...current.aiChat,
                      provider: value as IntegrationConfig["aiChat"]["provider"],
                    },
                  }))
                }
              />
              <TextField
                label="模型名称"
                value={integrationConfig.aiChat.model}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    aiChat: { ...current.aiChat, model: value },
                  }))
                }
              />
              <TextField
                label="接口地址"
                value={integrationConfig.aiChat.apiUrl}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    aiChat: { ...current.aiChat, apiUrl: value },
                  }))
                }
              />
              <TextField
                label="API Key"
                value={integrationConfig.aiChat.apiKey}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    aiChat: { ...current.aiChat, apiKey: value },
                  }))
                }
              />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium">系统提示词</span>
              <textarea
                value={integrationConfig.aiChat.systemPrompt}
                rows={4}
                onChange={(event) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    aiChat: { ...current.aiChat, systemPrompt: event.target.value },
                  }))
                }
                className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
              />
            </label>
          </section>

          <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">充值方式接口</h2>
                <p className="mt-1 text-sm text-ink/55">
                  配置后，前台充值会先提交到这里的充值接口，再生成后台订单。
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={integrationConfig.recharge.enabled}
                  onChange={(event) =>
                    setIntegrationConfig((current) => ({
                      ...current,
                      recharge: { ...current.recharge, enabled: event.target.checked },
                    }))
                  }
                />
                启用
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="充值方式"
                value={integrationConfig.recharge.provider}
                options={[
                  ["manual", "人工审核"],
                  ["wechat_pay", "微信支付"],
                  ["alipay", "支付宝"],
                  ["stripe", "Stripe"],
                  ["bank_transfer", "银行转账"],
                  ["custom", "自定义"],
                ]}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    recharge: {
                      ...current.recharge,
                      provider: value as IntegrationConfig["recharge"]["provider"],
                    },
                  }))
                }
              />
              <TextField
                label="商户号"
                value={integrationConfig.recharge.merchantId}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    recharge: { ...current.recharge, merchantId: value },
                  }))
                }
              />
              <TextField
                label="接口地址"
                value={integrationConfig.recharge.apiUrl}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    recharge: { ...current.recharge, apiUrl: value },
                  }))
                }
              />
              <TextField
                label="接口密钥"
                value={integrationConfig.recharge.apiKey}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    recharge: { ...current.recharge, apiKey: value },
                  }))
                }
              />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium">充值说明</span>
              <textarea
                value={integrationConfig.recharge.instructions}
                rows={4}
                onChange={(event) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    recharge: { ...current.recharge, instructions: event.target.value },
                  }))
                }
                className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
              />
            </label>
          </section>

          <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">提现方式接口</h2>
                <p className="mt-1 text-sm text-ink/55">
                  配置后，前台提现会先提交到这里的提现接口，再生成后台订单。
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={integrationConfig.withdraw.enabled}
                  onChange={(event) =>
                    setIntegrationConfig((current) => ({
                      ...current,
                      withdraw: { ...current.withdraw, enabled: event.target.checked },
                    }))
                  }
                />
                启用
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="提现方式"
                value={integrationConfig.withdraw.provider}
                options={[
                  ["manual", "人工审核"],
                  ["wechat_pay", "微信提现"],
                  ["alipay", "支付宝提现"],
                  ["stripe", "Stripe"],
                  ["bank_transfer", "银行转账"],
                  ["custom", "自定义"],
                ]}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    withdraw: {
                      ...current.withdraw,
                      provider: value as IntegrationConfig["withdraw"]["provider"],
                    },
                  }))
                }
              />
              <TextField
                label="商户号"
                value={integrationConfig.withdraw.merchantId}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    withdraw: { ...current.withdraw, merchantId: value },
                  }))
                }
              />
              <TextField
                label="接口地址"
                value={integrationConfig.withdraw.apiUrl}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    withdraw: { ...current.withdraw, apiUrl: value },
                  }))
                }
              />
              <TextField
                label="接口密钥"
                value={integrationConfig.withdraw.apiKey}
                onChange={(value) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    withdraw: { ...current.withdraw, apiKey: value },
                  }))
                }
              />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-medium">提现说明</span>
              <textarea
                value={integrationConfig.withdraw.instructions}
                rows={4}
                onChange={(event) =>
                  setIntegrationConfig((current) => ({
                    ...current,
                    withdraw: { ...current.withdraw, instructions: event.target.value },
                  }))
                }
                className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
              />
            </label>
          </section>

          <button
            type="button"
            onClick={saveIntegrations}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-jade"
          >
            <Save className="h-4 w-4" />
            保存接口配置
          </button>
          {savedText ? <p className="text-center text-sm font-semibold text-jade">{savedText}</p> : null}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">用户列表</h2>
                <p className="mt-1 text-sm text-ink/55">
                  输入邮箱可快速筛选用户，下面订单明细也会同步筛选。
                </p>
              </div>
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="输入用户邮箱"
                className="w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 text-sm outline-none focus:border-jade sm:w-72"
              />
            </div>

            {selectedUserEmail ? (
              <div className="mt-4 rounded-lg border border-black/10 bg-cloud p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">用户资料卡</p>
                    <h3 className="mt-1 text-xl font-semibold">{selectedUserEmail}</h3>
                    <p className="mt-1 text-sm text-ink/55">
                      状态：{selectedUser?.status === "frozen" ? "已冻结" : "正常"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedUser}
                    onClick={() =>
                      updateSelectedUser({
                        status: selectedUser?.status === "frozen" ? "active" : "frozen",
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-jade disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedUser?.status === "frozen" ? (
                      <Unlock className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {selectedUser?.status === "frozen" ? "解冻用户" : "封号冻结"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadOnlyMetric
                    label="用户余额"
                    value={`¥${(selectedUserSummary?.userBalance ?? 0).toFixed(2)}`}
                  />
                  <ReadOnlyMetric
                    label="充值总额"
                    value={`¥${(selectedUserSummary?.rechargeAmount ?? 0).toFixed(2)}`}
                  />
                  <ReadOnlyMetric
                    label="提现总额"
                    value={`¥${(selectedUserSummary?.withdrawAmount ?? 0).toFixed(2)}`}
                  />
                  <ReadOnlyMetric
                    label="AI 余额"
                    value={`¥${(selectedUserSummary?.aiBalance ?? 0).toFixed(2)}`}
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg bg-white p-4">
                    <p className="text-sm text-ink/55">注册时间</p>
                    <p className="mt-1 font-semibold">{formatTime(selectedUser?.createdAt ?? "")}</p>
                    <p className="mt-4 text-sm text-ink/55">最近登录</p>
                    <p className="mt-1 font-semibold">{formatTime(selectedUser?.lastLoginAt ?? "")}</p>
                  </div>
                  <div className="rounded-lg bg-white p-4">
                    <p className="text-sm font-semibold">登录记录</p>
                    <div className="mt-2 max-h-32 space-y-1 overflow-auto text-sm text-ink/60">
                      {selectedUser?.loginRecords.length ? (
                        selectedUser.loginRecords.map((record) => (
                          <p key={record}>{formatTime(record)}</p>
                        ))
                      ) : (
                        <p>暂无登录记录</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newUserPassword}
                    onChange={(event) => setNewUserPassword(event.target.value)}
                    placeholder="输入新密码，至少 6 位"
                    type="password"
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-jade sm:max-w-xs"
                  />
                  <button
                    type="button"
                    disabled={!selectedUser}
                    onClick={() => updateSelectedUser({ password: newUserPassword })}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    修改密码
                  </button>
                </div>
                {!selectedUser ? (
                  <p className="mt-3 text-sm font-semibold text-amber-700">
                    该用户来自历史订单记录，还没有完整注册档案，需用户注册或登录后才能管理账号。
                  </p>
                ) : null}
                {userActionText ? <p className="mt-3 text-sm font-semibold text-jade">{userActionText}</p> : null}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-ink/55">
                    <th className="py-3 pr-4 font-medium">用户邮箱</th>
                    <th className="py-3 pr-4 font-medium">订单数</th>
                    <th className="py-3 pr-4 font-medium">待处理</th>
                    <th className="py-3 pr-4 font-medium">充值</th>
                    <th className="py-3 pr-4 font-medium">提现</th>
                    <th className="py-3 pr-4 font-medium">拨款</th>
                    <th className="py-3 pr-4 font-medium">取回</th>
                    <th className="py-3 pr-4 font-medium">用户余额</th>
                    <th className="py-3 pr-4 font-medium">AI 余额</th>
                    <th className="py-3 pr-4 font-medium">最近订单</th>
                  </tr>
                </thead>
                <tbody>
                  {userSummaries.length ? (
                    userSummaries.map((user) => (
                      <tr
                        key={user.email}
                        onClick={() => {
                          setSelectedUserEmail(user.email);
                          setUserActionText("");
                          setNewUserPassword("");
                        }}
                        className={`cursor-pointer border-b border-black/5 transition hover:bg-cloud ${
                          selectedUserEmail === user.email ? "bg-mint/40" : ""
                        }`}
                      >
                        <td className="py-3 pr-4 font-semibold">{user.email}</td>
                        <td className="py-3 pr-4">{user.orderCount}</td>
                        <td className="py-3 pr-4">{user.pendingCount}</td>
                        <td className="py-3 pr-4">¥{user.rechargeAmount.toFixed(2)}</td>
                        <td className="py-3 pr-4">¥{user.withdrawAmount.toFixed(2)}</td>
                        <td className="py-3 pr-4">¥{user.fundAmount.toFixed(2)}</td>
                        <td className="py-3 pr-4">¥{user.returnAmount.toFixed(2)}</td>
                        <td className="py-3 pr-4 font-semibold">¥{user.userBalance.toFixed(2)}</td>
                        <td className="py-3 pr-4 font-semibold">¥{user.aiBalance.toFixed(2)}</td>
                        <td className="py-3 pr-4">{formatTime(user.latestOrderAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-8 text-center text-ink/50" colSpan={10}>
                        暂无匹配用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-black/5 bg-white p-5 shadow-soft">
            <div>
              <h2 className="text-lg font-semibold">用户订单明细</h2>
              <p className="mt-1 text-sm text-ink/55">查看当前筛选用户的全部钱包记录。</p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-ink/55">
                    <th className="py-3 pr-4 font-medium">订单号</th>
                    <th className="py-3 pr-4 font-medium">用户</th>
                    <th className="py-3 pr-4 font-medium">类型</th>
                    <th className="py-3 pr-4 font-medium">金额</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">用户余额</th>
                    <th className="py-3 pr-4 font-medium">AI 余额</th>
                    <th className="py-3 pr-4 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserOrders.length ? (
                    filteredUserOrders.map((order) => (
                      <tr key={order.id} className="border-b border-black/5">
                        <td className="py-3 pr-4 font-mono text-xs">{order.id}</td>
                        <td className="py-3 pr-4">{order.userEmail ?? "-"}</td>
                        <td className="py-3 pr-4">{getWalletOrderTypeLabel(order.type)}</td>
                        <td className="py-3 pr-4 font-semibold">¥{order.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4">{getWalletOrderStatusLabel(order.status)}</td>
                        <td className="py-3 pr-4">¥{order.userBalanceAfter.toFixed(2)}</td>
                        <td className="py-3 pr-4">¥{order.aiBalanceAfter.toFixed(2)}</td>
                        <td className="py-3 pr-4">{formatTime(order.createdAt)}</td>
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
          </section>
        </div>
      )}
    </div>
  );
}

function sumOrders(orders: WalletOrder[], type: WalletOrderType) {
  return orders
    .filter((order) => order.type === type && order.status === "success")
    .reduce((sum, order) => sum + order.amount, 0);
}

function buildUserSummaries(orders: WalletOrder[], query: string, users: AdminUserProfile[] = []) {
  const normalizedQuery = query.trim().toLowerCase();
  const summaries = new Map<string, UserSummary>();

  users.forEach((user) => {
    if (normalizedQuery && !user.email.includes(normalizedQuery)) return;

    summaries.set(user.email, {
      email: user.email,
      orderCount: 0,
      rechargeAmount: 0,
      withdrawAmount: 0,
      fundAmount: 0,
      returnAmount: 0,
      pendingCount: 0,
      userBalance: 0,
      aiBalance: 0,
      latestOrderAt: user.lastLoginAt || user.createdAt,
    });
  });

  orders.forEach((order) => {
    if (!order.userEmail) return;

    const email = order.userEmail.toLowerCase();
    if (normalizedQuery && !email.includes(normalizedQuery)) return;

    const current = summaries.get(email) ?? {
      email: order.userEmail,
      orderCount: 0,
      rechargeAmount: 0,
      withdrawAmount: 0,
      fundAmount: 0,
      returnAmount: 0,
      pendingCount: 0,
      userBalance: order.userBalanceAfter,
      aiBalance: order.aiBalanceAfter,
      latestOrderAt: order.createdAt,
    };

    const next: UserSummary = {
      ...current,
      orderCount: current.orderCount + 1,
      pendingCount: current.pendingCount + (order.status === "pending" ? 1 : 0),
      rechargeAmount: current.rechargeAmount + successAmount(order, "recharge"),
      withdrawAmount: current.withdrawAmount + successAmount(order, "withdraw"),
      fundAmount: current.fundAmount + successAmount(order, "fund_ai"),
      returnAmount: current.returnAmount + successAmount(order, "return_ai"),
    };

    if (toTime(order.createdAt) >= toTime(current.latestOrderAt)) {
      next.userBalance = order.userBalanceAfter;
      next.aiBalance = order.aiBalanceAfter;
      next.latestOrderAt = order.createdAt;
    }

    summaries.set(email, next);
  });

  return [...summaries.values()].sort(
    (left, right) => toTime(right.latestOrderAt) - toTime(left.latestOrderAt),
  );
}

function successAmount(order: WalletOrder, type: WalletOrderType) {
  return order.type === type && order.status === "success" ? order.amount : 0;
}

function needsReview(order: WalletOrder) {
  return (
    order.status === "pending" && (order.type === "recharge" || order.type === "withdraw")
  );
}

function formatTime(value: string) {
  if (!value) return "-";
  const time = new Date(value);

  if (Number.isNaN(time.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
}

function toTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-black/10 bg-cloud px-3 py-2 outline-none focus:border-jade"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cloud px-3 py-3">
      <div className="text-sm text-ink/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
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
