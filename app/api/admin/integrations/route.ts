import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import {
  readIntegrationConfig,
  type IntegrationConfig,
  writeIntegrationConfig,
} from "@/lib/integration-config";

async function requireAdmin() {
  const token = cookies().get(adminCookieName)?.value;

  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ config: await readIntegrationConfig() });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { config?: Partial<IntegrationConfig> };
  const config = await writeIntegrationConfig(body.config ?? {});

  return NextResponse.json({ config });
}

