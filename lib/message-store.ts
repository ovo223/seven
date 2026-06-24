import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type SiteMessageType = "announcement" | "support";

export type SiteMessage = {
  id: string;
  type: SiteMessageType;
  title: string;
  content: string;
  targetEmail: string;
  createdAt: string;
};

type MessageStoreGlobal = typeof globalThis & {
  __aiEmployeeMessages?: SiteMessage[];
};

const globalStore = globalThis as MessageStoreGlobal;
const projectDataDir = path.join(process.cwd(), "data");
const tmpDataDir = path.join(os.tmpdir(), "ai-employee-platform");
const projectMessagesFile = path.join(projectDataDir, "messages.json");
const tmpMessagesFile = path.join(tmpDataDir, "messages.json");

function normalizeMessage(value: Partial<SiteMessage>): SiteMessage | null {
  if (!value.title || !value.content) return null;

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : `MSG-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    type: value.type === "support" ? "support" : "announcement",
    title: String(value.title),
    content: String(value.content),
    targetEmail: typeof value.targetEmail === "string" ? value.targetEmail.trim().toLowerCase() : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

async function readMessagesFile(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  const messages = JSON.parse(raw) as Partial<SiteMessage>[];

  return Array.isArray(messages)
    ? messages.map(normalizeMessage).filter((message): message is SiteMessage => Boolean(message))
    : [];
}

async function writeMessagesFile(filePath: string, messages: SiteMessage[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
}

export async function readMessages(): Promise<SiteMessage[]> {
  if (globalStore.__aiEmployeeMessages) return globalStore.__aiEmployeeMessages;

  try {
    const messages = await readMessagesFile(projectMessagesFile);
    globalStore.__aiEmployeeMessages = messages;

    return messages;
  } catch {
    try {
      const messages = await readMessagesFile(tmpMessagesFile);
      globalStore.__aiEmployeeMessages = messages;

      return messages;
    } catch {
      globalStore.__aiEmployeeMessages = [];

      return [];
    }
  }
}

export async function writeMessages(messages: SiteMessage[]) {
  globalStore.__aiEmployeeMessages = messages;

  await Promise.any([
    writeMessagesFile(projectMessagesFile, messages),
    writeMessagesFile(tmpMessagesFile, messages),
  ]).catch(() => undefined);
}

export async function createMessage(message: Omit<SiteMessage, "id" | "createdAt">) {
  const nextMessage: SiteMessage = {
    ...message,
    id: `MSG-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  const messages = await readMessages();
  await writeMessages([nextMessage, ...messages]);

  return nextMessage;
}

export async function deleteMessage(id: string) {
  const messages = await readMessages();
  const nextMessages = messages.filter((message) => message.id !== id);
  await writeMessages(nextMessages);

  return nextMessages.length !== messages.length;
}
