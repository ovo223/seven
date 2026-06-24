import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AiChatProvider = "mock" | "openai" | "deepseek" | "qwen" | "custom";
export type RechargeProvider = "manual" | "wechat_pay" | "alipay" | "stripe" | "bank_transfer" | "custom";
export type WithdrawProvider = "manual" | "wechat_pay" | "alipay" | "stripe" | "bank_transfer" | "custom";

export type AiChatConfig = {
  enabled: boolean;
  provider: AiChatProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

export type RechargeConfig = {
  enabled: boolean;
  provider: RechargeProvider;
  apiUrl: string;
  merchantId: string;
  apiKey: string;
  instructions: string;
};

export type WithdrawConfig = {
  enabled: boolean;
  provider: WithdrawProvider;
  apiUrl: string;
  merchantId: string;
  apiKey: string;
  instructions: string;
};

export type IntegrationConfig = {
  aiChat: AiChatConfig;
  recharge: RechargeConfig;
  withdraw: WithdrawConfig;
};

export const defaultIntegrationConfig: IntegrationConfig = {
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

const dataDir = path.join(process.cwd(), "data");
const configFile = path.join(dataDir, "integration-config.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeAiProvider(value: unknown): AiChatProvider {
  return value === "openai" || value === "deepseek" || value === "qwen" || value === "custom"
    ? value
    : "mock";
}

function normalizeRechargeProvider(value: unknown): RechargeProvider {
  return value === "wechat_pay" ||
    value === "alipay" ||
    value === "stripe" ||
    value === "bank_transfer" ||
    value === "custom"
    ? value
    : "manual";
}

function normalizeWithdrawProvider(value: unknown): WithdrawProvider {
  return value === "wechat_pay" ||
    value === "alipay" ||
    value === "stripe" ||
    value === "bank_transfer" ||
    value === "custom"
    ? value
    : "manual";
}

export function normalizeIntegrationConfig(value: Partial<IntegrationConfig> = {}): IntegrationConfig {
  const aiChat = (value.aiChat ?? {}) as Partial<AiChatConfig>;
  const recharge = (value.recharge ?? {}) as Partial<RechargeConfig>;
  const withdraw = (value.withdraw ?? {}) as Partial<WithdrawConfig>;

  return {
    aiChat: {
      enabled: toBoolean(aiChat.enabled, defaultIntegrationConfig.aiChat.enabled),
      provider: normalizeAiProvider(aiChat.provider),
      apiUrl: toString(aiChat.apiUrl).trim(),
      apiKey: toString(aiChat.apiKey).trim(),
      model: toString(aiChat.model).trim(),
      systemPrompt: toString(aiChat.systemPrompt),
    },
    recharge: {
      enabled: toBoolean(recharge.enabled, defaultIntegrationConfig.recharge.enabled),
      provider: normalizeRechargeProvider(recharge.provider),
      apiUrl: toString(recharge.apiUrl).trim(),
      merchantId: toString(recharge.merchantId).trim(),
      apiKey: toString(recharge.apiKey).trim(),
      instructions: toString(recharge.instructions, defaultIntegrationConfig.recharge.instructions),
    },
    withdraw: {
      enabled: toBoolean(withdraw.enabled, defaultIntegrationConfig.withdraw.enabled),
      provider: normalizeWithdrawProvider(withdraw.provider),
      apiUrl: toString(withdraw.apiUrl).trim(),
      merchantId: toString(withdraw.merchantId).trim(),
      apiKey: toString(withdraw.apiKey).trim(),
      instructions: toString(withdraw.instructions, defaultIntegrationConfig.withdraw.instructions),
    },
  };
}

export async function readIntegrationConfig() {
  try {
    const raw = await readFile(configFile, "utf8");
    return normalizeIntegrationConfig(JSON.parse(raw) as Partial<IntegrationConfig>);
  } catch {
    return defaultIntegrationConfig;
  }
}

export async function writeIntegrationConfig(config: Partial<IntegrationConfig>) {
  await ensureDataDir();
  const normalizedConfig = normalizeIntegrationConfig(config);
  await writeFile(configFile, JSON.stringify(normalizedConfig, null, 2), "utf8");

  return normalizedConfig;
}
