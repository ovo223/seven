export type PlatformState = {
  brandName: string;
  aiName: string;
  aiInitial: string;
  aiIntro: string;
  isLoggedIn: boolean;
  userBalance: number;
  aiBalance: number;
  dailyIncome: number;
  totalIncome: number;
};

export const platformStateKey = "ai-employee-platform-state";
export const platformStateEvent = "platform-state-change";

export const defaultPlatformState: PlatformState = {
  brandName: "AI员工",
  aiName: "Mira",
  aiInitial: "M",
  aiIntro: "您的 AI 数字员工，负责接收任务和回复消息，以及帮您创造收益。",
  isLoggedIn: false,
  userBalance: 100,
  aiBalance: 10,
  dailyIncome: 0,
  totalIncome: 0,
};

export function readPlatformState(): PlatformState {
  if (typeof window === "undefined") return defaultPlatformState;

  const raw = window.localStorage.getItem(platformStateKey);
  if (!raw) return defaultPlatformState;

  try {
    return {
      ...defaultPlatformState,
      ...(JSON.parse(raw) as Partial<PlatformState>),
    };
  } catch {
    return defaultPlatformState;
  }
}

export function writePlatformState(nextState: PlatformState) {
  window.localStorage.setItem(platformStateKey, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(platformStateEvent, { detail: nextState }));
}

export function resetPlatformState() {
  writePlatformState(defaultPlatformState);
}
