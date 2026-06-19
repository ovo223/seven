import { NextResponse } from "next/server";
import { handleWalletRequest, type WalletAction } from "@/lib/payment-provider";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: WalletAction;
      amount?: number;
    };

    if (body.action !== "recharge" && body.action !== "withdraw") {
      return NextResponse.json({ error: "不支持的钱包操作。" }, { status: 400 });
    }

    if (!Number.isFinite(body.amount) || !body.amount || body.amount <= 0) {
      return NextResponse.json({ error: "金额无效。" }, { status: 400 });
    }

    const result = await handleWalletRequest({
      action: body.action,
      amount: body.amount,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "钱包接口处理失败。" }, { status: 500 });
  }
}
