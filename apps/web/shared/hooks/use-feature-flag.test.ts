import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { useFeatureIsOn } = vi.hoisted(() => ({ useFeatureIsOn: vi.fn() }));
vi.mock("@growthbook/growthbook-react", () => ({ useFeatureIsOn }));

import { useFeatureFlag } from "./use-feature-flag";

describe("useFeatureFlag", () => {
  it("isNewAuthDesign читает флаг new-auth-key", () => {
    useFeatureIsOn.mockReturnValue(true);
    const { result } = renderHook(() => useFeatureFlag());
    expect(useFeatureIsOn).toHaveBeenCalledWith("new-auth-key");
    expect(result.current.isNewAuthDesign).toBe(true);
  });
  it("выключенный флаг даёт false", () => {
    useFeatureIsOn.mockReturnValue(false);
    const { result } = renderHook(() => useFeatureFlag());
    expect(result.current.isNewAuthDesign).toBe(false);
  });
});
