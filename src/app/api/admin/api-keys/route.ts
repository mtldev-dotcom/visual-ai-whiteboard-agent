import crypto from "crypto";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const prisma = getPrismaClient();
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const body = (await request.json()) as {
    name?: string;
    userId?: string;
    scopes?: string[];
    expiresAt?: string;
  };

  if (!body.name || !body.userId) {
    return NextResponse.json(
      { error: "name and userId are required." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const rawKey = `sk-${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 10);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: body.name,
      keyHash,
      keyPrefix,
      userId: body.userId,
      scopes: body.scopes ?? ["read"],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  // Return full raw key only once
  return NextResponse.json({ apiKey, rawKey }, { status: 201 });
}
