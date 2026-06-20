export type PlatformState = {
  brandName: string;
  aiName: string;
  aiInitial: string;
  aiIntro: string;
  isLoggedIn: boolean;
  userBalance: number;
  aiBalance: number;
  dailyIncome: number;
  totalIncome: number;
};

export type WalletOrderType = "recharge" | "withdraw" | "fund_ai" | "return_ai";
export type WalletOrderStatus = "pending" | "success" | "failed";

export type WalletOrder = {
  id: string;
  type: WalletOrderType;
  status: WalletOrderStatus;
  amount: number;
  userBalanceAfter: number;
  aiBalanceAfter: number;
  note: string;
  createdAt: string;
};

export const platformStateKey = "ai-employee-platform-state";
export const walletOrdersKey = "ai-employee-wallet-orders";
export const platformStateEvent = "platform-state-change";
export const walletOrdersEvent = "wallet-orders-change";

export const defaultPlatformState: PlatformState = {
  brandName: "AI 员工",
  aiName: "Mira",
  aiInitial: "M",
  aiIntro: "您的 AI 数字员工，负责接收任务和回复消息，以及帮您创造收益。",
  isLoggedIn: false,
  userBalance: 100,
  aiBalance: 10,
  dailyIncome: 0,
  totalIncome: 0,
};

export function readPlatformState(): PlatformState {
  if (typeof window === "undefined") return defaultPlatformState;

  const raw = window.localStorage.getItem(platformStateKey);
  if (!raw) return defaultPlatformState;

  try {
    return {
      ...defaultPlatformState,
      ...(JSON.parse(raw) as Partial<PlatformState>),
    };
  } catch {
    return defaultPlatformState;
  }
}

export function writePlatformState(nextState: PlatformState) {
  window.localStorage.setItem(platformStateKey, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(platformStateEvent, { detail: nextState }));
}

export function resetPlatformState() {
  writePlatformState(defaultPlatformState);
}

export function readWalletOrders(): WalletOrder[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(walletOrdersKey);
  if (!raw) return [];

  try {
    const orders = JSON.parse(raw) as WalletOrder[];
    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

export function writeWalletOrders(orders: WalletOrder[]) {
  window.localStorage.setItem(walletOrdersKey, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(walletOrdersEvent, { detail: orders }));
}

export function createWalletOrder(order: Omit<WalletOrder, "id" | "createdAt">) {
  const nextOrder: WalletOrder = {
    ...order,
    id: `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  writeWalletOrders([nextOrder, ...readWalletOrders()]);

  return nextOrder;
}

export function updateWalletOrderStatus(orderId: string, status: WalletOrderStatus) {
  const orders = readWalletOrders().map((order) =>
    order.id === orderId ? { ...order, status } : order,
  );
  writeWalletOrders(orders);
}

export function clearWalletOrders() {
  writeWalletOrders([]);
}

export function getWalletOrderTypeLabel(type: WalletOrderType) {
  const labels: Record<WalletOrderType, string> = {
    recharge: "充值",
    withdraw: "提现",
    fund_ai: "拨款",
    return_ai: "取回",
  };

  return labels[type];
}

export function getWalletOrderStatusLabel(status: WalletOrderStatus) {
  const labels: Record<WalletOrderStatus, string> = {
    pending: "待处理",
    success: "已完成",
    failed: "已拒绝",
  };

  return labels[status];
}
