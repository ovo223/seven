import { NextResponse } from "next/server";
import {
  adminCookieName,
  createAdminToken,
  getAdminPassword,
  getAdminUsername,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ message: "后台账号未配置" }, { status: 500 });
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (body.username !== getAdminUsername() || body.password !== getAdminPassword()) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, await createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
