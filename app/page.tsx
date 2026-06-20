"use client";

import { SendHorizontal, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createWalletOrder,
  defaultPlatformState,
  platformStateEvent,
  readPlatformState,
  type PlatformState,
  writePlatformState,
} from "@/lib/platform-state";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function HomePage() {
  const [state, setState] = useState<PlatformState>(defaultPlatformState);
  const [userWalletAmount, setUserWalletAmount] = useState("100");
  const [aiWalletAmount, setAiWalletAmount] = useState("10");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isWalletBusy, setIsWalletBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "hello",
      role: "assistant",
      content: `你好，我是 ${defaultPlatformState.aiName}。你可以直接给我一个任务。`,
    },
  ]);

  useEffect(() => {
    setState(readPlatformState());

    function syncState(event?: Event) {
      const customEvent = event as CustomEvent<PlatformState>;
      setState(customEvent?.detail ?? readPlatformState());
    }

    function syncStorage(event: StorageEvent) {
      if (event.key === "ai-employee-platform-state") {
        setState(readPlatformState());
      }
    }

    window.addEventListener(platformStateEvent, syncState);
    window.addEventListener("storage", syncStorage);

    return () => {
      window.removeEventListener(platformStateEvent, syncState);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== "hello") return current;

      return [
        {
          ...current[0],
          content: `你好，我是 ${state.aiName}。你可以直接给我一个任务。`,
        },
      ];
    });
  }, [state.aiName]);

  const canSend = input.trim().length > 0 && !isReplying;

  function updateState(patch: Partial<PlatformState>) {
    const nextState = { ...state, ...patch };
    setState(nextState);
    writePlatformState(nextState);

    return nextState;
  }

  async function recordOrder({
    type,
    amount,
    nextState,
    note,
  }: {
    type: "recharge" | "withdraw" | "fund_ai" | "return_ai";
    amount: number;
    nextState: PlatformState;
    note: string;
  }) {
    const order = {
      type,
      status: "success",
      amount,
      userBalanceAfter: nextState.userBalance,
      aiBalanceAfter: nextState.aiBalance,
      note,
    } as const;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!response.ok) throw new Error("Order request failed");
    } catch {
      createWalletOrder(order);
    }
  }

  async function callWalletApi(action: "recharge" | "withdraw", amount: number) {
    const response = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount }),
    });

    if (!response.ok) throw new Error("Wallet request failed");

    return (await response.json()) as { message?: string };
  }

  async function rechargeUserWallet() {
    const amount = Number(userWalletAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("请输入有效充值金额。");
      return;
    }

    setIsWalletBusy(true);
    setStatus("正在发起充值...");

    try {
      await callWalletApi("recharge", amount);
      const nextState = updateState({
        userBalance: Number((state.userBalance + amount).toFixed(2)),
      });
      await recordOrder({
        type: "recharge",
        amount,
        nextState,
        note: "用户钱包充值",
      });
      setStatus(`用户钱包已充值 ¥${amount.toFixed(2)}。`);
    } catch {
      setStatus("充值接口暂不可用，请稍后再试。");
    } finally {
      setIsWalletBusy(false);
    }
  }

  async function withdrawUserWallet() {
    const amount = Number(userWalletAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("请输入有效提现金额。");
      return;
    }

    if (state.userBalance < amount) {
      setStatus("用户钱包余额不足，无法提现。");
      return;
    }

    setIsWalletBusy(true);
    setStatus("正在发起提现...");

    try {
      await callWalletApi("withdraw", amount);
      const nextState = updateState({
        userBalance: Number((state.userBalance - amount).toFixed(2)),
      });
      await recordOrder({
        type: "withdraw",
        amount,
        nextState,
        note: "用户钱包提现",
      });
      setStatus(`用户钱包已提现 ¥${amount.toFixed(2)}。`);
    } catch {
      setStatus("提现接口暂不可用，请稍后再试。");
    } finally {
      setIsWalletBusy(false);
    }
  }

  function fundAiWallet() {
    const amount = Number(aiWalletAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("请输入有效拨款金额。");
      return;
    }

    if (state.userBalance < amount) {
      setStatus("用户钱包余额不足，无法拨款。");
      return;
    }

    const nextState = updateState({
      userBalance: Number((state.userBalance - amount).toFixed(2)),
      aiBalance: Number((state.aiBalance + amount).toFixed(2)),
    });
    void recordOrder({
      type: "fund_ai",
      amount,
      nextState,
      note: `从用户钱包拨款给 ${state.aiName}`,
    });
    setStatus(`已从用户钱包给 ${state.aiName} 拨款 ¥${amount.toFixed(2)}。`);
  }

  function withdrawFromAiWallet() {
    const amount = Number(aiWalletAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("请输入有效取回金额。");
      return;
    }

    if (state.aiBalance < amount) {
      setStatus("AI 员工钱包余额不足，无法取回。");
      return;
    }

    const nextState = updateState({
      aiBalance: Number((state.aiBalance - amount).toFixed(2)),
      userBalance: Number((state.userBalance + amount).toFixed(2)),
    });
    void recordOrder({
      type: "return_ai",
      amount,
      nextState,
      note: `从 ${state.aiName} 钱包取回到用户钱包`,
    });
    setStatus(`已从 ${state.aiName} 钱包取回 ¥${amount.toFixed(2)}。`);
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setStatus(`${state.aiName} 正在思考...`);
    setIsReplying(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const data = (await response.json()) as { content?: string; provider?: string };

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content ?? `收到。我会处理这个任务：「${text}」。`,
        },
      ]);
      setStatus(data.provider && data.provider !== "mock" ? `模型接口：${data.provider}` : "");
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `收到。我会处理这个任务：「${text}」。`,
        },
      ]);
      setStatus("接口暂不可用，已使用本地模拟回复。");
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div className="grid min-h-0 overflow-hidden rounded-lg border border-black/5 bg-white shadow-soft xl:h-[calc(100dvh-8rem)] xl:grid-cols-[320px_1fr]">
      <aside className="border-b border-black/5 p-3 xl:min-h-0 xl:overflow-y-auto xl:border-b-0 xl:border-r xl:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 xl:flex-nowrap xl:gap-4">
          <div className="flex min-w-0 items-center gap-2 font-semibold xl:gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold text-white">
              AI
            </div>
            <span className="whitespace-nowrap text-base font-semibold tracking-normal">
              {state.brandName}
            </span>
          </div>
          {state.isLoggedIn ? (
            <div className="mobile-top-balance order-3 w-full rounded-lg bg-mint px-2 py-1 text-center text-[11px] font-semibold text-jade">
              用户 ¥{state.userBalance.toFixed(2)} · AI ¥{state.aiBalance.toFixed(2)}
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
            <button
              type="button"
              onClick={() => updateState({ isLoggedIn: true })}
              className="h-8 min-w-[52px] whitespace-nowrap rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-ink transition hover:bg-cloud xl:h-9 xl:min-w-[64px] xl:px-4 xl:text-sm"
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => updateState({ isLoggedIn: true })}
              className="h-8 min-w-[52px] whitespace-nowrap rounded-full bg-ink px-3 text-xs font-semibold text-white transition hover:bg-jade xl:h-9 xl:min-w-[64px] xl:px-4 xl:text-sm"
            >
              注册
            </button>
          </div>
        </div>

        <section className="mt-3 xl:mt-8">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-lg font-semibold text-white xl:h-16 xl:w-16 xl:text-2xl">
            {state.aiInitial}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal xl:mt-4 xl:text-3xl">
            {state.aiName}
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink/65 xl:mt-3">{state.aiIntro}</p>
        </section>

        {state.isLoggedIn ? (
          <section className="mt-3 rounded-lg bg-cloud p-3 xl:mt-7 xl:p-5">
            <div className="text-sm text-ink/60">用户钱包</div>
            <p className="mt-1 text-2xl font-semibold xl:mt-2 xl:text-3xl">
              ¥{state.userBalance.toFixed(2)}
            </p>
            <label className="mt-2 block text-sm font-medium xl:mt-5" htmlFor="userWalletAmount">
              充值 / 提现金额
            </label>
            <input
              id="userWalletAmount"
              type="number"
              min="1"
              value={userWalletAmount}
              onChange={(event) => setUserWalletAmount(event.target.value)}
              className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-jade"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={rechargeUserWallet}
                disabled={isWalletBusy}
                className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-jade disabled:cursor-not-allowed disabled:bg-black/20"
              >
                充值
              </button>
              <button
                type="button"
                onClick={withdrawUserWallet}
                disabled={isWalletBusy}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-50"
              >
                提现
              </button>
            </div>
          </section>
        ) : null}

        {state.isLoggedIn ? (
          <section className="mt-3 rounded-lg bg-cloud p-3 xl:mt-4 xl:p-5">
            <div className="flex items-center gap-2 text-sm text-ink/60">
              <WalletCards className="h-4 w-4" />
              AI 员工钱包
            </div>
            <p className="mt-1 text-2xl font-semibold xl:mt-2 xl:text-3xl">
              ¥{state.aiBalance.toFixed(2)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 xl:mt-4">
              <div className="rounded-lg bg-white p-3">
                <div className="text-xs text-ink/50">当日收益</div>
                <div className="mt-1 font-semibold">¥{state.dailyIncome.toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-white p-3">
                <div className="text-xs text-ink/50">总收益</div>
                <div className="mt-1 font-semibold">¥{state.totalIncome.toFixed(2)}</div>
              </div>
            </div>

            <label className="mt-2 block text-sm font-medium xl:mt-5" htmlFor="aiWalletAmount">
              拨款 / 取回金额
            </label>
            <div className="mt-2 grid gap-2">
              <input
                id="aiWalletAmount"
                type="number"
                min="1"
                value={aiWalletAmount}
                onChange={(event) => setAiWalletAmount(event.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 outline-none transition focus:border-jade"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fundAiWallet}
                  className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-jade"
                >
                  拨款
                </button>
                <button
                  type="button"
                  onClick={withdrawFromAiWallet}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-mint"
                >
                  取回
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {state.isLoggedIn ? (
          <div className="mt-3 rounded-lg bg-mint p-3 text-sm leading-6 text-jade xl:mt-5 xl:p-4">
            规则：拨款会从用户钱包转入 AI 员工钱包，取回则反向转回用户钱包。
          </div>
        ) : null}
      </aside>

      <section className="flex min-h-0 flex-col xl:overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/5 p-4 xl:p-5">
          <div>
            <h2 className="text-xl font-semibold">和 {state.aiName} 聊天</h2>
          </div>
          {state.isLoggedIn ? (
            <div className="hidden rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-jade xl:block">
              用户 ¥{state.userBalance.toFixed(2)} · AI ¥{state.aiBalance.toFixed(2)}
            </div>
          ) : null}
        </header>

        <div className="h-[42dvh] min-h-[320px] shrink-0 space-y-3 overflow-y-auto bg-cloud p-4 xl:h-auto xl:min-h-0 xl:shrink xl:flex-1 xl:space-y-4 xl:p-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user" ? "bg-ink text-white" : "bg-white text-ink"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <footer className="shrink-0 border-t border-black/5 p-3 xl:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_64px] items-stretch gap-2 xl:grid-cols-[minmax(0,1fr)_72px] xl:gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="输入你想让 AI 员工做什么..."
              rows={1}
              className="h-14 min-w-0 resize-none rounded-lg border border-black/10 bg-white px-4 py-4 text-sm leading-6 outline-none transition focus:border-jade xl:h-[64px] xl:py-5"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!canSend}
              className="grid h-14 w-16 place-items-center rounded-lg bg-ink text-sm font-semibold text-white transition hover:bg-jade disabled:cursor-not-allowed disabled:bg-black/20 xl:h-[64px] xl:w-[72px]"
              aria-label="发送"
              title="发送"
            >
              {isReplying ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span className="flex items-center gap-1">
                  发送
                  <SendHorizontal className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
          <div className="mt-2 min-h-5 text-sm text-clay">{status}</div>
        </footer>
      </section>
    </div>
  );
}
