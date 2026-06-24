import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { readUsers, updateUser, type UserStatus } from "@/lib/user-store";

async function requireAdmin() {
  const token = cookies().get(adminCookieName)?.value;

  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ users: await readUsers() });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    email?: string;
    status?: UserStatus;
    password?: string;
  };

  if (!body.email) {
    return NextResponse.json({ message: "缺少用户邮箱。" }, { status: 400 });
  }

  if (body.status && body.status !== "active" && body.status !== "frozen") {
    return NextResponse.json({ message: "用户状态无效。" }, { status: 400 });
  }

  if (body.password !== undefined && body.password.trim().length < 6) {
    return NextResponse.json({ message: "新密码至少需要 6 位。" }, { status: 400 });
  }

  const user = await updateUser(body.email, {
    status: body.status,
    password: body.password?.trim(),
  });

  if (!user) {
    return NextResponse.json({ message: "用户不存在。" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
