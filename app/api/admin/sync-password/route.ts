import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/sync-password
 * Re-hashes ADMIN_PASSWORD env var and updates the admin user in the DB.
 * Safe to call any time you change ADMIN_PASSWORD in Vercel env vars.
 * Security: only works if you already control the deployment env vars.
 */
export async function GET() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL or ADMIN_PASSWORD env var not set." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash },
    create: { email, name: "Ed Henderson", password: hash },
  });

  return NextResponse.json({
    ok: true,
    message: `Password synced for ${user.email}. You can now log in with your current ADMIN_PASSWORD.`,
  });
}
