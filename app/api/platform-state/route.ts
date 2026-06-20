import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import {
  readServerPlatformState,
  resetServerPlatformState,
  writeServerPlatformState,
} from "@/lib/platform-store";
import { normalizePlatformState, type PlatformState } from "@/lib/platform-state";

async function requireAdmin() {
  const token = cookies().get(adminCookieName)?.value;

  return verifyAdminToken(token);
}

export async function GET() {
  return NextResponse.json({ state: await readServerPlatformState() });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { state?: Partial<PlatformState> };
  const state = await writeServerPlatformState(normalizePlatformState(body.state));

  return NextResponse.json({ state });
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ state: await resetServerPlatformState() });
}
