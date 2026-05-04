import { archiveBoard, createBoard } from "../src/db/boards";
import { recordAuditEvent } from "../src/db/audit";
import { createCanvasItem, softDeleteCanvasItem } from "../src/db/canvas-items";
import { getPrismaClient } from "../src/db/client";
import {
  createCustomHtmlWidgetDefinition,
  storeCustomHtmlWidgetSource,
} from "../src/db/widgets";
import { createReminder } from "../src/db/reminders";
import { createTask } from "../src/db/tasks";
import {
  consumeTelegramLinkToken,
  createTelegramLinkTokenRecord,
  getActiveTelegramAccount,
  unlinkTelegramAccount,
} from "../src/db/telegram";
import { createWorkspace } from "../src/db/workspaces";

async function main() {
  const prisma = getPrismaClient();
  const suffix = Date.now();

  const workspace = await createWorkspace({
    ownerUserId: `smoke-user-${suffix}`,
    name: "Smoke Test Workspace",
  });

  const board = await createBoard({
    workspaceId: workspace.id,
    title: "Smoke Test Board",
    createdBy: "system",
  });

  const item = await createCanvasItem({
    workspaceId: workspace.id,
    boardId: board.id,
    type: "sticky_note",
    x: 0,
    y: 0,
    width: 240,
    height: 160,
    content: { text: "Smoke test item" },
    createdBy: "system",
  });

  await softDeleteCanvasItem(item.id);
  await archiveBoard(board.id);
  const widgetDefinition = await createCustomHtmlWidgetDefinition({
    category: "demo",
    description: "Smoke test custom HTML widget",
    key: `smoke_widget_${suffix}`,
    name: "Smoke Widget",
    version: "0.1.0",
  });
  await storeCustomHtmlWidgetSource({
    createdBy: "system",
    html: "<html><body>Smoke</body></html>",
    version: "0.1.0",
    widgetDefinitionId: widgetDefinition.id,
  });
  const task = await createTask({
    boardId: board.id,
    createdBy: "system",
    title: "Smoke task",
    workspaceId: workspace.id,
  });
  await createReminder({
    createdBy: "system",
    remindAt: new Date(Date.now() + 60_000),
    taskId: task.id,
    title: "Smoke reminder",
    workspaceId: workspace.id,
  });
  await recordAuditEvent({
    action: "board.created",
    actorId: "smoke-system",
    actorType: "system",
    summary: "Smoke test audit event",
    targetId: board.id,
    targetType: "Board",
    workspaceId: workspace.id,
  });
  const telegramToken = await createTelegramLinkTokenRecord({
    ownerUserId: workspace.ownerUserId,
    workspaceId: workspace.id,
  });
  const telegramUserId = `smoke-telegram-${suffix}`;
  const linkedAccount = await consumeTelegramLinkToken({
    sender: {
      firstName: "Smoke",
      telegramUserId,
      username: `smoke_${suffix}`,
    },
    token: telegramToken.token,
  });

  if (!linkedAccount.ok) {
    throw new Error(linkedAccount.error);
  }

  const activeTelegramAccount = await getActiveTelegramAccount(telegramUserId);

  if (!activeTelegramAccount) {
    throw new Error("Expected linked Telegram account in smoke test.");
  }

  await unlinkTelegramAccount(workspace.ownerUserId);
  await prisma.widgetDefinition.delete({ where: { id: widgetDefinition.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } });

  console.log("Database smoke test passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
