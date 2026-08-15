import { describe, it, expect } from "vitest";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";
import { DEVICE_STATE_REPORTED, LATEST_DATA, DEVICE_TREE_JSON } from "./fixtures/reads";

// Override the transport with fixtures so we test parsing only.
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

  it("parses device state from the AWSJSON reported string", async () => {
    const s = await c.getDeviceState("DEV1");
    expect(s.setPoint).toBe(395);
    expect(s.awaySetPoint).toBe(55);
    expect(s.opMode).toBe(1);
    expect(s.displayName).toBe("badkamer ");
  });

  it("parses latest data from the AWSJSON data string", async () => {
    const d = await c.getLatestData("DEV1");
    expect(d.currentTemp).toBe(268);
    expect(d.roomSensTemp).toBe(268);
    expect(d.floorSensTemp).toBe(238);
    expect(d.relayState).toBe(0);
  });

  it("walks the nested device tree and extracts thermostats with their zone", async () => {
    const tree = await c.getDeviceTree();
    expect(tree).toEqual([{ id: "DEV1", name: "bathroom", zone: "bathroom" }]);
  });
});
