-- CreateTable
CREATE TABLE "WidgetDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "renderStrategy" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "stateSchema" JSONB NOT NULL DEFAULT '{}',
    "sourceVersioned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetInstance" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "boardId" TEXT,
    "canvasItemId" TEXT,
    "widgetDefinitionId" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomHtmlWidgetSource" (
    "id" TEXT NOT NULL,
    "widgetDefinitionId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT,
    "js" TEXT,
    "createdBy" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomHtmlWidgetSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetDefinition_key_key" ON "WidgetDefinition"("key");

-- CreateIndex
CREATE INDEX "WidgetDefinition_kind_idx" ON "WidgetDefinition"("kind");

-- CreateIndex
CREATE INDEX "WidgetDefinition_category_idx" ON "WidgetDefinition"("category");

-- CreateIndex
CREATE INDEX "WidgetInstance_workspaceId_idx" ON "WidgetInstance"("workspaceId");

-- CreateIndex
CREATE INDEX "WidgetInstance_boardId_idx" ON "WidgetInstance"("boardId");

-- CreateIndex
CREATE INDEX "WidgetInstance_widgetDefinitionId_idx" ON "WidgetInstance"("widgetDefinitionId");

-- CreateIndex
CREATE INDEX "CustomHtmlWidgetSource_riskLevel_idx" ON "CustomHtmlWidgetSource"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CustomHtmlWidgetSource_widgetDefinitionId_version_key" ON "CustomHtmlWidgetSource"("widgetDefinitionId", "version");

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetInstance" ADD CONSTRAINT "WidgetInstance_widgetDefinitionId_fkey" FOREIGN KEY ("widgetDefinitionId") REFERENCES "WidgetDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomHtmlWidgetSource" ADD CONSTRAINT "CustomHtmlWidgetSource_widgetDefinitionId_fkey" FOREIGN KEY ("widgetDefinitionId") REFERENCES "WidgetDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
