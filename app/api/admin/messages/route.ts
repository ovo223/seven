import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { createMessage, deleteMessage, readMessages, type SiteMessageType } from "@/lib/message-store";

async function requireAdmin() {
  const token = cookies().get(adminCookieName)?.value;

  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ messages: await readMessages() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    type?: SiteMessageType;
    title?: string;
    content?: string;
    targetEmail?: string;
  };
  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const targetEmail = body.targetEmail?.trim().toLowerCase() ?? "";

  if (!title || !content) {
    return NextResponse.json({ message: "请填写标题和内容。" }, { status: 400 });
  }

  const message = await createMessage({
    type: body.type === "support" ? "support" : "announcement",
    title,
    content,
    targetEmail,
  });

  return NextResponse.json({ message });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  if (!id) {
    return NextResponse.json({ message: "缺少消息 ID。" }, { status: 400 });
  }

  const deleted = await deleteMessage(id);

  if (!deleted) {
    return NextResponse.json({ message: "消息不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
