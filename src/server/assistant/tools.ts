export type ToolActor = {
  type: "user" | "assistant" | "system" | "telegram";
  id: string;
};

export type ToolContext = {
  workspaceId: string;
  actor: ToolActor;
};

export type ToolValidationResult = { ok: true } | { ok: false; error: string };

export type ToolResult<Output = unknown> = {
  ok: boolean;
  summary: string;
  output?: Output;
  error?: string;
};

export type ToolDefinition<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3 | 4;
  validate(
    input: unknown,
  ): ToolValidationResult | Promise<ToolValidationResult>;
  execute(input: Input, context: ToolContext): Promise<ToolResult<Output>>;
};

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
  }

  list() {
    return [...this.tools.values()].map((tool) => ({
      description: tool.description,
      name: tool.name,
      permissionLevel: tool.permissionLevel,
    }));
  }

  get(name: string) {
    return this.tools.get(name);
  }

  async execute(name: string, input: unknown, context: ToolContext) {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        error: `Unknown tool: ${name}`,
        ok: false,
        summary: "Tool was not found.",
      } satisfies ToolResult;
    }

    const validation = await tool.validate(input);

    if (!validation.ok) {
      return {
        error: validation.error,
        ok: false,
        summary: "Tool input validation failed.",
      } satisfies ToolResult;
    }

    return tool.execute(input, context);
  }
}

export function createToolRegistry() {
  return new ToolRegistry();
}
