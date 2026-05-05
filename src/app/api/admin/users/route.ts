import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const prisma = getPrismaClient();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { workspaces: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "email and password are required." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const normalized = body.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      email: normalized,
      passwordHash,
      name: body.name ?? null,
      role: body.role === "ADMIN" ? "ADMIN" : "USER",
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
