import type { DeviceSummary } from "../../lib/ouman/types";

export interface PairedDevice {
  name: string;
  data: { id: string };
  store: { refreshToken: string; tenant: string };
}

/** Map discovered thermostats into Homey device objects, stashing the refresh token per device. */
export function buildPairedDevices(tree: DeviceSummary[], refreshToken: string, tenant: string): PairedDevice[] {
  return tree.map((d) => ({
    name: d.name,
    data: { id: d.id },
    store: { refreshToken, tenant },
  }));
}
