import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WalletOrder, WalletOrderStatus } from "@/lib/platform-state";

const dataDir = path.join(process.cwd(), "data");
const ordersFile = path.join(dataDir, "wallet-orders.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readServerOrders(): Promise<WalletOrder[]> {
  try {
    const raw = await readFile(ordersFile, "utf8");
    const orders = JSON.parse(raw) as WalletOrder[];

    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

export async function writeServerOrders(orders: WalletOrder[]) {
  await ensureDataDir();
  await writeFile(ordersFile, JSON.stringify(orders, null, 2), "utf8");
}

export async function createServerOrder(order: Omit<WalletOrder, "id" | "createdAt">) {
  const nextOrder: WalletOrder = {
    ...order,
    id: `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  const orders = await readServerOrders();
  await writeServerOrders([nextOrder, ...orders]);

  return nextOrder;
}

export async function updateServerOrderStatus(orderId: string, status: WalletOrderStatus) {
  const orders = await readServerOrders();
  const nextOrders = orders.map((order) => (order.id === orderId ? { ...order, status } : order));
  await writeServerOrders(nextOrders);

  return nextOrders.find((order) => order.id === orderId) ?? null;
}

export async function clearServerOrders() {
  await writeServerOrders([]);
}
