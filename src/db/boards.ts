import type { Board } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CreateBoardInput = {
  workspaceId: string;
  title: string;
  description?: string;
  createdBy: "user" | "assistant" | "system" | "import";
};

export type CreateSubBoardInput = CreateBoardInput & {
  parentBoardId: string;
};

export type UpdateBoardInput = {
  boardId: string;
  title?: string;
  description?: string | null;
};

export function createBoard(input: CreateBoardInput): Promise<Board> {
  const prisma = getPrismaClient();

  return prisma.board.create({
    data: {
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}

export function createSubBoard(input: CreateSubBoardInput): Promise<Board> {
  const prisma = getPrismaClient();

  return prisma.board.create({
    data: {
      workspaceId: input.workspaceId,
      parentBoardId: input.parentBoardId,
      title: input.title,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}

export function listBoardsForWorkspace(workspaceId: string): Promise<Board[]> {
  const prisma = getPrismaClient();

  return prisma.board.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getBoardById(boardId: string): Promise<Board | null> {
  const prisma = getPrismaClient();

  return prisma.board.findFirst({
    where: {
      id: boardId,
      archivedAt: null,
    },
  });
}

export function updateBoard(input: UpdateBoardInput): Promise<Board> {
  const prisma = getPrismaClient();

  return prisma.board.update({
    where: { id: input.boardId },
    data: {
      title: input.title,
      description: input.description,
    },
  });
}

export function archiveBoard(boardId: string): Promise<Board> {
  const prisma = getPrismaClient();

  return prisma.board.update({
    where: { id: boardId },
    data: { archivedAt: new Date() },
  });
}

export function listSubBoards(parentBoardId: string): Promise<Board[]> {
  const prisma = getPrismaClient();

  return prisma.board.findMany({
    where: {
      parentBoardId,
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}
