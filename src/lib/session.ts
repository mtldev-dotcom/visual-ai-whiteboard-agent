import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

export type AppSession = {
  userId: string;
  workspaceId: string;
  email: string;
};

export async function requireSession(): Promise<
  { session: AppSession; error: null } | { session: null; error: NextResponse }
> {
  const raw = await getServerSession(authOptions);

  if (!raw?.user?.id || !raw.user.workspaceId) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
      session: null,
    };
  }

  return {
    error: null,
    session: {
      email: raw.user.email,
      userId: raw.user.id,
      workspaceId: raw.user.workspaceId,
    },
  };
}
