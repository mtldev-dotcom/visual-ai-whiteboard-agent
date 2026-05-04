import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { getOrCreateWorkspaceForUser } from "@/db/workspaces";
import { hashPassword } from "@/lib/password";
import { isSignupEnabled } from "@/lib/signup";
import { seedOnboardingBoard } from "@/server/onboarding";

export async function POST(request: Request) {
  try {
    if (!isSignupEnabled()) {
      return NextResponse.json(
        { error: "Signup is currently disabled." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
      },
    });

    const workspace = await getOrCreateWorkspaceForUser(user.id, user.name ?? user.email);
    await seedOnboardingBoard(workspace.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
