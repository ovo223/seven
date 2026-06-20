import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import {
  clearServerOrders,
  createServerOrder,
  readServerOrders,
  updateServerOrderStatus,
} from "@/lib/order-store";
import type { WalletOrderStatus, WalletOrderType } from "@/lib/platform-state";

async function requireAdmin() {
  const token = cookies().get(adminCookieName)?.value;

  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ orders: await readServerOrders() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: WalletOrderType;
    status?: WalletOrderStatus;
    amount?: number;
    userBalanceAfter?: number;
    aiBalanceAfter?: number;
    note?: string;
  };

  if (!body.type || !Number.isFinite(body.amount) || Number(body.amount) <= 0) {
    return NextResponse.json({ message: "Invalid order payload" }, { status: 400 });
  }

  const order = await createServerOrder({
    type: body.type,
    status: body.status ?? "success",
    amount: Number(body.amount),
    userBalanceAfter: Number(body.userBalanceAfter ?? 0),
    aiBalanceAfter: Number(body.aiBalanceAfter ?? 0),
    note: body.note ?? "",
  });

  return NextResponse.json({ order });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    status?: WalletOrderStatus;
  };

  if (!body.id || !body.status) {
    return NextResponse.json({ message: "Invalid update payload" }, { status: 400 });
  }

  const order = await updateServerOrderStatus(body.id, body.status);

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await clearServerOrders();

  return NextResponse.json({ ok: true });
}
