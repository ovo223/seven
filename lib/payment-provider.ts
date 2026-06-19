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
