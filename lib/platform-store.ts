import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  defaultPlatformState,
  normalizePlatformState,
  type PlatformState,
} from "@/lib/platform-state";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "platform-state.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readServerPlatformState(): Promise<PlatformState> {
  try {
    const raw = await readFile(stateFile, "utf8");
    return normalizePlatformState(JSON.parse(raw) as Partial<PlatformState>);
  } catch {
    return defaultPlatformState;
  }
}

export async function writeServerPlatformState(nextState: PlatformState) {
  await ensureDataDir();
  const normalizedState = normalizePlatformState(nextState);
  await writeFile(stateFile, JSON.stringify(normalizedState, null, 2), "utf8");

  return normalizedState;
}

export async function resetServerPlatformState() {
  return writeServerPlatformState(defaultPlatformState);
}
