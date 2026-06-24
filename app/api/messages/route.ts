import { NextResponse } from "next/server";
import { readMessages } from "@/lib/message-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await readMessages();
  const visibleMessages = messages.filter(
    (message) => !message.targetEmail || message.targetEmail === email,
  );

  return NextResponse.json({ messages: visibleMessages });
}
