import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";

// Opt-in full end-to-end test. Skipped unless a gitignored env.json with real
// Etherma credentials is present. Exercises the whole client against the live
// cloud: discovery -> SRP login -> real GraphQL reads. READ-ONLY — it never
// writes/actuates the device (that stays the one deliberate action at Task 10).
const creds: { ETHERMA_EMAIL?: string; ETHERMA_PASSWORD?: string } | null = (() => {
  try {
    return JSON.parse(readFileSync("env.json", "utf8"));
  } catch {
    return null;
  }
})();

const maybe = creds?.ETHERMA_EMAIL ? describe : describe.skip;

maybe("live e2e read flow (requires env.json)", () => {
  it(
    "logs in and reads the device tree, state and latest data end-to-end",
    async () => {
      const client = new OumanCloudClient({ tenant: "etherma" });

      const refreshToken = await client.login(creds!.ETHERMA_EMAIL!, creds!.ETHERMA_PASSWORD!);
      expect(refreshToken.length).toBeGreaterThan(20);

      const tree = await client.getDeviceTree();
      expect(tree.length).toBeGreaterThan(0);
      expect(typeof tree[0].id).toBe("string");

      const id = tree[0].id;
      const state = await client.getDeviceState(id);
      expect(typeof state.setPoint).toBe("number");
      expect(typeof state.awaySetPoint).toBe("number");
      expect(typeof state.opMode).toBe("number");

      const latest = await client.getLatestData(id);
      expect(typeof latest.currentTemp).toBe("number");
      expect(typeof latest.floorSensTemp).toBe("number");
      expect(typeof latest.relayState).toBe("number"); // 0-100 %
      expect(typeof latest.rssi).toBe("number");
    },
    20000, // SRP handshake + several round-trips to a sleepy device
  );
});
