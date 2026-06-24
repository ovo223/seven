import { readIntegrationConfig } from "@/lib/integration-config";

export type WalletAction = "recharge" | "withdraw";

export type WalletRequest = {
  action: WalletAction;
  amount: number;
};

export type WalletResult = {
  provider: string;
  status: "success" | "pending" | "failed";
  transactionId: string;
  message: string;
};

const paymentProvider = process.env.PAYMENT_PROVIDER ?? "mock";

export async function handleWalletRequest(request: WalletRequest): Promise<WalletResult> {
  const configuredResult = await handleConfiguredRecharge(request);
  if (configuredResult) return configuredResult;

  switch (paymentProvider) {
    case "stripe":
      return createReservedResult("stripe", request);
    case "wechat_pay":
      return createReservedResult("wechat_pay", request);
    case "alipay":
      return createReservedResult("alipay", request);
    case "bank_transfer":
      return createReservedResult("bank_transfer", request);
    case "manual":
      return createReservedResult("manual", request);
    case "mock":
    default:
      return createMockResult(request);
  }
}

async function handleConfiguredRecharge(request: WalletRequest): Promise<WalletResult | null> {
  const { recharge } = await readIntegrationConfig();

  if (!recharge.enabled || request.action !== "recharge") return null;

  if (!recharge.apiUrl || recharge.provider === "manual") {
    return {
      provider: recharge.provider,
      status: "pending",
      transactionId: `${recharge.provider}_${request.action}_${Date.now()}`,
      message: recharge.instructions || "充值订单已提交，请等待后台处理。",
    };
  }

  try {
    const response = await fetch(recharge.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(recharge.apiKey ? { Authorization: `Bearer ${recharge.apiKey}` } : {}),
      },
      body: JSON.stringify({
        action: request.action,
        amount: request.amount,
        merchantId: recharge.merchantId || undefined,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      status?: "success" | "pending" | "failed";
      transactionId?: string;
      message?: string;
    };

    return {
      provider: recharge.provider,
      status: data.status ?? "pending",
      transactionId: data.transactionId ?? `${recharge.provider}_${request.action}_${Date.now()}`,
      message: data.message ?? recharge.instructions ?? "充值接口已提交，请等待处理。",
    };
  } catch {
    return {
      provider: recharge.provider,
      status: "failed",
      transactionId: `${recharge.provider}_${request.action}_${Date.now()}`,
      message: "充值接口调用失败，请检查后台充值方式接口配置。",
    };
  }
}

function createMockResult(request: WalletRequest): WalletResult {
  return {
    provider: "mock",
    status: "success",
    transactionId: `mock_${request.action}_${Date.now()}`,
    message: request.action === "recharge" ? "模拟充值成功。" : "模拟提现成功。",
  };
}

function createReservedResult(provider: string, request: WalletRequest): WalletResult {
  return {
    provider,
    status: "pending",
    transactionId: `${provider}_${request.action}_${Date.now()}`,
    message:
      request.action === "recharge"
        ? `已进入 ${provider} 充值接口预留流程。`
        : `已进入 ${provider} 提现接口预留流程。`,
  };
}
