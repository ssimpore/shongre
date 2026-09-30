import { beforeEach, describe, expect, it, vi } from "vitest";

const os = vi.hoisted(() => ({
  query: vi.fn(),
  listen: vi.fn(),
  event: undefined as ((value: boolean) => void) | undefined,
  subscriptions: [] as Array<{
    subscribe: (listener: () => void) => () => void;
    snapshot: () => boolean;
  }>,
}));
vi.mock("react-native", () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: os.query,
    addEventListener: os.listen,
  },
}));
vi.mock("react", () => ({
  useSyncExternalStore: (
    subscribe: (listener: () => void) => () => void,
    snapshot: () => boolean,
  ) => {
    os.subscriptions.push({ subscribe, snapshot });
    return snapshot();
  },
}));

describe("native system motion preference", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    os.subscriptions = [];
    os.event = undefined;
    os.listen.mockImplementation((_event, listener) => {
      os.event = listener;
      return { remove: vi.fn() };
    });
  });
  it("starts still, shares one subscription, then honors the OS result and live changes", async () => {
    os.query.mockResolvedValue(false);
    const { useReducedMotion } =
      await import("../src/hooks/useReducedMotion.native");
    expect(useReducedMotion()).toBe(true);
    useReducedMotion();
    const first = vi.fn();
    const second = vi.fn();
    const disposeFirst = os.subscriptions[0].subscribe(first);
    const disposeSecond = os.subscriptions[1].subscribe(second);
    await Promise.resolve();
    expect(os.listen).toHaveBeenCalledTimes(1);
    expect(os.listen).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function),
    );
    expect(os.subscriptions[0].snapshot()).toBe(false);
    os.event!(true);
    expect(os.subscriptions[0].snapshot()).toBe(true);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    const remove = os.listen.mock.results[0].value.remove;
    disposeFirst();
    expect(remove).not.toHaveBeenCalled();
    disposeSecond();
    expect(remove).toHaveBeenCalledOnce();
  });
  it("does not let an old startup query overwrite a newer preference event", async () => {
    let resolve!: (value: boolean) => void;
    os.query.mockReturnValue(
      new Promise<boolean>((done) => {
        resolve = done;
      }),
    );
    const { useReducedMotion } =
      await import("../src/hooks/useReducedMotion.native");
    useReducedMotion();
    const dispose = os.subscriptions[0].subscribe(vi.fn());
    os.event!(true);
    resolve(false);
    await Promise.resolve();
    expect(os.subscriptions[0].snapshot()).toBe(true);
    dispose();
  });
  it("starts still again when preferences may have changed without mounted controls", async () => {
    os.query
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(new Promise(() => {}));
    const { useReducedMotion } =
      await import("../src/hooks/useReducedMotion.native");
    useReducedMotion();
    const dispose = os.subscriptions[0].subscribe(vi.fn());
    await Promise.resolve();
    expect(os.subscriptions[0].snapshot()).toBe(false);
    dispose();
    expect(useReducedMotion()).toBe(true);
    const disposeNext = os.subscriptions[1].subscribe(vi.fn());
    expect(os.query).toHaveBeenCalledTimes(2);
    expect(os.subscriptions[1].snapshot()).toBe(true);
    disposeNext();
  });
  it("ignores pending queries after the final control unsubscribes", async () => {
    let resolve!: (value: boolean) => void;
    os.query.mockReturnValue(
      new Promise<boolean>((done) => {
        resolve = done;
      }),
    );
    const { useReducedMotion } =
      await import("../src/hooks/useReducedMotion.native");
    useReducedMotion();
    const notify = vi.fn();
    os.subscriptions[0].subscribe(notify)();
    resolve(false);
    await Promise.resolve();
    expect(notify).not.toHaveBeenCalled();
    expect(os.subscriptions[0].snapshot()).toBe(true);
  });
  it("keeps motion reduced when reading the preference fails", async () => {
    os.query.mockRejectedValue(new Error("Unavailable"));
    const { useReducedMotion } =
      await import("../src/hooks/useReducedMotion.native");
    useReducedMotion();
    const dispose = os.subscriptions[0].subscribe(vi.fn());
    await Promise.resolve();
    await Promise.resolve();
    expect(os.subscriptions[0].snapshot()).toBe(true);
    dispose();
  });
});
