import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const { id } = await params;
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { workspaces: true, apiKeys: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === admin!.userId) {
    return NextResponse.json(
      { error: "Cannot modify your own account via admin API." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { role?: string; name?: string };
  const prisma = getPrismaClient();

  const data: { role?: "USER" | "ADMIN"; name?: string } = {};
  if (body.role === "ADMIN" || body.role === "USER") data.role = body.role;
  if (typeof body.name === "string") data.name = body.name;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, updatedAt: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === admin!.userId) {
    return NextResponse.json(
      { error: "Cannot delete your own account." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
