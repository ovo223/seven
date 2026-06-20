import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "admin-login-fallback-2026-06-20-2",
  });
}
