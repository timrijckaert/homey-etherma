import { OpMode } from "../../lib/ouman/types";

/** Values of the custom `etherma_mode` enum capability. */
export type ModeId = "home" | "away" | "timeplan" | "antifreeze" | "energy";

const MODE_TO_ID: Record<OpMode, ModeId> = {
  [OpMode.Home]: "home",
  [OpMode.Away]: "away",
  [OpMode.TimePlan]: "timeplan",
  [OpMode.AntiFreeze]: "antifreeze",
  [OpMode.EnergyMgmt]: "energy",
};

const ID_TO_MODE: Record<ModeId, OpMode> = {
  home: OpMode.Home,
  away: OpMode.Away,
  timeplan: OpMode.TimePlan,
  antifreeze: OpMode.AntiFreeze,
  energy: OpMode.EnergyMgmt,
};

export function opModeToId(mode: OpMode): ModeId {
  return MODE_TO_ID[mode] ?? "home";
}

export function idToOpMode(id: ModeId): OpMode {
  return ID_TO_MODE[id] ?? OpMode.Home;
}

/** Boolean heating indicator derived from the 0-100 relay level. */
export function isHeating(relayState: number): boolean {
  return relayState > 0;
}
