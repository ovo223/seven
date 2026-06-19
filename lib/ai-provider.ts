export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatProvider = "mock" | "openai" | "deepseek" | "qwen" | "custom";

export type ChatReply = {
  provider: ChatProvider;
  content: string;
};

const provider = (process.env.AI_PROVIDER ?? "mock") as ChatProvider;

export async function generateAiReply(messages: ChatMessage[]): Promise<ChatReply> {
  switch (provider) {
    case "openai":
      return generateOpenAiReply(messages);
    case "deepseek":
      return generateDeepSeekReply(messages);
    case "qwen":
      return generateQwenReply(messages);
    case "custom":
      return generateCustomReply(messages);
    case "mock":
    default:
      return generateMockReply(messages);
  }
}

async function generateMockReply(messages: ChatMessage[]): Promise<ChatReply> {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const task = lastUserMessage?.content ?? "你的需求";

  return {
    provider: "mock",
    content: `收到。我会先理解你的需求，再拆成可执行步骤：${task}`,
  };
}

async function generateOpenAiReply(messages: ChatMessage[]): Promise<ChatReply> {
  // TODO: Fill OPENAI_API_KEY and implement the official OpenAI Responses API call.
  // Keep this function shape stable so the frontend does not need to change.
  return providerNotConfigured("openai", messages);
}

async function generateDeepSeekReply(messages: ChatMessage[]): Promise<ChatReply> {
  // TODO: Fill DEEPSEEK_API_KEY and call the DeepSeek chat endpoint.
  return providerNotConfigured("deepseek", messages);
}

async function generateQwenReply(messages: ChatMessage[]): Promise<ChatReply> {
  // TODO: Fill QWEN_API_KEY and call the Qwen/DashScope endpoint.
  return providerNotConfigured("qwen", messages);
}

async function generateCustomReply(messages: ChatMessage[]): Promise<ChatReply> {
  // TODO: Fill CUSTOM_MODEL_API_URL and CUSTOM_MODEL_API_KEY for a private model gateway.
  return providerNotConfigured("custom", messages);
}

function providerNotConfigured(providerName: ChatProvider, messages: ChatMessage[]): ChatReply {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return {
    provider: providerName,
    content: `当前已切换到 ${providerName} 接口位，但还没有配置真实 API。用户需求是：${lastUserMessage?.content ?? "空"}`,
  };
}
