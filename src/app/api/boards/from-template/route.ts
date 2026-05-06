import { NextResponse } from "next/server";

import { requireSession } from "@/lib/session";
import {
  BOARD_TEMPLATES,
  createBoardFromTemplate,
} from "@/server/board-templates";

export async function GET() {
  return NextResponse.json({ templates: BOARD_TEMPLATES.map(({ id, name, description, category }) => ({ id, name, description, category })) });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as { templateId?: string };
  if (!body.templateId) {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  const result = await createBoardFromTemplate(body.templateId, session.workspaceId);
  if (!result) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ boardId: result.boardId, boardTitle: result.boardTitle }, { status: 201 });
}
