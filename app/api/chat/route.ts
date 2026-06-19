import { NextResponse } from "next/server";
import { generateAiReply, type ChatMessage } from "@/lib/ai-provider";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages ?? [];

    if (!messages.some((message) => message.role === "user" && message.content.trim())) {
      return NextResponse.json({ error: "缺少用户消息。" }, { status: 400 });
    }

    const reply = await generateAiReply(messages);

    return NextResponse.json(reply);
  } catch {
    return NextResponse.json({ error: "AI 回复生成失败。" }, { status: 500 });
  }
}
