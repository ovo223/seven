import { NextResponse } from "next/server";
import { loginUser, readUsers, registerUser } from "@/lib/user-store";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "login" | "register" | "sync";
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";

  if (body.action !== "login" && body.action !== "register" && body.action !== "sync") {
    return NextResponse.json({ message: "不支持的用户操作。" }, { status: 400 });
  }

  if (!isValidEmail(email) || password.length < 6) {
    return NextResponse.json({ message: "请输入有效邮箱和至少 6 位密码。" }, { status: 400 });
  }

  if (body.action === "register") {
    const { user, created } = await registerUser(email, password);

    if (!created) {
      return NextResponse.json({ message: "该邮箱已注册，请直接登录。" }, { status: 409 });
    }

    return NextResponse.json({ user: publicUser(user) });
  }

  if (body.action === "sync") {
    const users = await readUsers();
    const user = users.find((item) => item.email === email);

    if (!user || user.password !== password) {
      return NextResponse.json({ message: "账号信息已变更，请重新登录。" }, { status: 401 });
    }

    if (user.status === "frozen") {
      return NextResponse.json({ message: "账号已被冻结，请联系管理员。" }, { status: 403 });
    }

    return NextResponse.json({ user: publicUser(user) });
  }

  const { user, reason } = await loginUser(email, password);

  if (reason === "frozen") {
    return NextResponse.json({ message: "账号已被冻结，请联系管理员。" }, { status: 403 });
  }

  if (!user) {
    return NextResponse.json({ message: "账号或密码错误。" }, { status: 401 });
  }

  return NextResponse.json({ user: publicUser(user) });
}

function publicUser(user: { email: string; status: string; createdAt: string; lastLoginAt: string }) {
  return {
    email: user.email,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}
