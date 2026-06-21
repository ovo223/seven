import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { WalletOrder, WalletOrderStatus } from "@/lib/platform-state";

type OrderStoreGlobal = typeof globalThis & {
  __aiEmployeeWalletOrders?: WalletOrder[];
};

const globalStore = globalThis as OrderStoreGlobal;
const projectDataDir = path.join(process.cwd(), "data");
const tmpDataDir = path.join(os.tmpdir(), "ai-employee-platform");
const projectOrdersFile = path.join(projectDataDir, "wallet-orders.json");
const tmpOrdersFile = path.join(tmpDataDir, "wallet-orders.json");

async function readOrdersFile(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  const orders = JSON.parse(raw) as WalletOrder[];

  return Array.isArray(orders) ? orders : [];
}

async function writeOrdersFile(filePath: string, orders: WalletOrder[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(orders, null, 2), "utf8");
}

export async function readServerOrders(): Promise<WalletOrder[]> {
  if (globalStore.__aiEmployeeWalletOrders) {
    return globalStore.__aiEmployeeWalletOrders;
  }

  try {
    const orders = await readOrdersFile(projectOrdersFile);
    globalStore.__aiEmployeeWalletOrders = orders;

    return orders;
  } catch {
    try {
      const orders = await readOrdersFile(tmpOrdersFile);
      globalStore.__aiEmployeeWalletOrders = orders;

      return orders;
    } catch {
      globalStore.__aiEmployeeWalletOrders = [];

      return [];
    }
  }
}

export async function writeServerOrders(orders: WalletOrder[]) {
  globalStore.__aiEmployeeWalletOrders = orders;

  await Promise.any([
    writeOrdersFile(projectOrdersFile, orders),
    writeOrdersFile(tmpOrdersFile, orders),
  ]).catch(() => undefined);
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
