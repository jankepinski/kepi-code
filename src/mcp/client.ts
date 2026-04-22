import {
  experimental_createMCPClient as createMCPClient,
  type ToolSet,
} from "ai";
import { Experimental_StdioMCPTransport as StdioTransport } from "ai/mcp-stdio";
import type { McpConfig, McpServerSpec } from "./schema.js";
import type { McpToolDescriptor } from "../context/system.js";

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

export interface McpConnection {
  name: string;
  client: MCPClient;
  tools: ToolSet;
}

export interface McpBundle {
  connections: McpConnection[];
  tools: ToolSet;
  descriptors: McpToolDescriptor[];
  close: () => Promise<void>;
}

async function connect(name: string, spec: McpServerSpec): Promise<McpConnection | null> {
  try {
    const client = await createMCPClient({
      transport: new StdioTransport({
        command: spec.command,
        args: spec.args,
        ...(spec.env ? { env: spec.env } : {}),
      }),
    });
    const tools = await client.tools();
    return { name, client, tools };
  } catch (err) {
    console.error(`[mcp] failed to connect to "${name}":`, (err as Error).message);
    return null;
  }
}

export async function connectMcpServers(config: McpConfig): Promise<McpBundle> {
  const entries = Object.entries(config.servers);
  const results = await Promise.all(entries.map(([name, spec]) => connect(name, spec)));
  const connections = results.filter((c): c is McpConnection => c !== null);

  const combinedTools: ToolSet = {};
  const descriptors: McpToolDescriptor[] = [];
  for (const conn of connections) {
    for (const [toolName, tool] of Object.entries(conn.tools)) {
      const prefixed = `${conn.name}__${toolName}`;
      combinedTools[prefixed] = tool;
      descriptors.push({
        name: prefixed,
        description:
          (tool as { description?: string }).description ?? `MCP tool from ${conn.name}`,
      });
    }
  }

  return {
    connections,
    tools: combinedTools,
    descriptors,
    close: async () => {
      await Promise.all(
        connections.map(async (c) => {
          try {
            await c.client.close();
          } catch {
            // ignore
          }
        }),
      );
    },
  };
}
