import { describe, it, expect } from "vitest";
import { OpMode } from "../lib/ouman/types";
import { opModeToId, idToOpMode, isHeating } from "../drivers/thermostat/mapping";

describe("mode mapping", () => {
  it("round-trips every OpMode <-> capability id", () => {
    for (const m of [OpMode.Home, OpMode.Away, OpMode.TimePlan, OpMode.AntiFreeze, OpMode.EnergyMgmt]) {
      expect(idToOpMode(opModeToId(m))).toBe(m);
    }
  });

  it("maps specific modes and ids", () => {
    expect(opModeToId(OpMode.AntiFreeze)).toBe("antifreeze");
    expect(idToOpMode("energy")).toBe(OpMode.EnergyMgmt);
  });
});

describe("heating derivation", () => {
  it("heating boolean reflects the relay level", () => {
    expect(isHeating(0)).toBe(false);
    expect(isHeating(100)).toBe(true);
    expect(isHeating(50)).toBe(true);
  });
});
