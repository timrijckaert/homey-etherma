import { describe, it, expect } from "vitest";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";
import { OpMode } from "../lib/ouman/types";
import { DEVICE_STATE_REPORTED, LATEST_DATA, DEVICE_TREE_JSON } from "./fixtures/reads";

// Override the transport with fixtures so we test parsing/normalization only.
class TestClient extends OumanCloudClient {
  protected async gql(_service: any, query: string, _variables: any): Promise<any> {
    if (query.includes("getDeviceState")) return { getDeviceState: { reported: DEVICE_STATE_REPORTED } };
    if (query.includes("getLatestData")) return { getLatestData: { data: LATEST_DATA } };
    if (query.includes("getDeviceTree")) return { getDeviceTree: DEVICE_TREE_JSON };
    throw new Error("unexpected query: " + query);
  }
}

describe("reads", () => {
  const c = new TestClient({ tenant: "etherma", refreshToken: "RT" });

  it("parses device state and normalizes temps to °C, mode to OpMode", async () => {
    const s = await c.getDeviceState("DEV1");
    expect(s.setPoint).toBe(40); // 400 -> 40.0 °C
    expect(s.awaySetPoint).toBe(5.5); // 55 -> 5.5 °C
    expect(s.opMode).toBe(OpMode.Home);
    expect(s.displayName).toBe("badkamer ");
  });

  it("parses latest data: temps in °C, relayState as a 0-100 number", async () => {
    const d = await c.getLatestData("DEV1");
    expect(d.currentTemp).toBe(26); // 260 -> 26.0 °C
    expect(d.floorSensTemp).toBe(23.9); // 239 -> 23.9 °C
    expect(d.relayState).toBe(100); // percentage, not 0/1
    expect(d.rssi).toBe(-46);
  });

  it("walks the nested device tree and extracts thermostats with their zone", async () => {
    const tree = await c.getDeviceTree();
    expect(tree).toEqual([{ id: "DEV1", name: "bathroom", zone: "bathroom" }]);
  });
});
