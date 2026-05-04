import { readFile, writeFile } from "fs/promises";
import path from "path";

export const CORE_FILE_NAMES = [
  "CORE.md",
  "ASSISTANT.md",
  "TOOLS.md",
  "SKILLS.md",
  "RULES.md",
  "MEMORY.md",
  "BOARDS.md",
  "USER_TEMPLATE.md",
] as const;

export type CoreFileName = (typeof CORE_FILE_NAMES)[number];

export const ASSISTANT_CONTEXT_CORE_FILE_NAMES = [
  "CORE.md",
  "ASSISTANT.md",
  "TOOLS.md",
  "SKILLS.md",
  "RULES.md",
] as const satisfies readonly CoreFileName[];

export type CoreFile = {
  name: CoreFileName;
  content: string;
};

const CORE_FILES_DIRECTORY = path.join(process.cwd(), "docs", "agent-core");
const MAX_CORE_FILE_BYTES = 200_000;

export function isCoreFileName(name: string): name is CoreFileName {
  return CORE_FILE_NAMES.includes(name as CoreFileName);
}

export function getCoreFilePath(name: string): string {
  if (!isCoreFileName(name)) {
    throw new Error(`Unsupported core file: ${name}`);
  }

  const filePath = path.resolve(CORE_FILES_DIRECTORY, name);
  const coreDirectory = path.resolve(CORE_FILES_DIRECTORY);

  if (!filePath.startsWith(`${coreDirectory}${path.sep}`)) {
    throw new Error(`Unsupported core file path: ${name}`);
  }

  return filePath;
}

export async function readCoreFile(name: CoreFileName): Promise<CoreFile> {
  return {
    content: await readFile(getCoreFilePath(name), "utf8"),
    name,
  };
}

export async function listCoreFiles(): Promise<CoreFile[]> {
  return Promise.all(CORE_FILE_NAMES.map((name) => readCoreFile(name)));
}

export async function writeCoreFile(
  name: string,
  content: string,
): Promise<void> {
  if (Buffer.byteLength(content, "utf8") > MAX_CORE_FILE_BYTES) {
    throw new Error("Core file content is too large.");
  }

  await writeFile(getCoreFilePath(name), content, "utf8");
}

export function formatCoreFilesForAssistantContext(files: CoreFile[]): string {
  return files
    .map((file) => `--- ${file.name} ---\n${file.content.trim()}`)
    .join("\n\n");
}

export async function loadAssistantCoreContext(): Promise<string> {
  const files = await Promise.all(
    ASSISTANT_CONTEXT_CORE_FILE_NAMES.map((name) => readCoreFile(name)),
  );

  return formatCoreFilesForAssistantContext(files);
}
