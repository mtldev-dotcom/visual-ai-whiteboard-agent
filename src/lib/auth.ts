import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getPrismaClient } from "@/db/client";
import { getOrCreateWorkspaceForUser } from "@/db/workspaces";
import { verifyPassword } from "@/lib/password";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      workspaceId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    workspaceId: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) return null;

        const valid = await verifyPassword(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;

        const workspace = await getOrCreateWorkspaceForUser(
          user.id,
          user.name ?? user.email,
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: workspace.id,
        } as {
          id: string;
          email: string;
          name: string | null;
          workspaceId: string;
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.workspaceId = (
          user as unknown as { workspaceId: string }
        ).workspaceId;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        id: token.userId,
        email: token.email ?? "",
        name: token.name,
        workspaceId: token.workspaceId,
      };
      return session;
    },
  },
};
