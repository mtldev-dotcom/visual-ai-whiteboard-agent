import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { listBoardsForWorkspace } from "@/db/boards";
import { authOptions } from "@/lib/auth";

import { WorkspaceShell } from "./components/WorkspaceShell";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const boards = await listBoardsForWorkspace(session.user.workspaceId);

  return (
    <WorkspaceShell
      initialBoards={boards.map((b) => ({
        id: b.id,
        title: b.title,
        parentBoardId: b.parentBoardId,
      }))}
      userEmail={session.user.email}
    />
  );
}
