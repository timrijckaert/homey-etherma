import { describe, it, expect } from "vitest";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";
import { OpMode } from "../lib/ouman/types";

// Capture the transport call so we can assert the exact payload shaping.
class CaptureClient extends OumanCloudClient {
  public captured: { query: string; variables: any } | null = null;
  protected async gql(_service: any, query: string, variables: any): Promise<any> {
    this.captured = { query, variables };
    return { requestStateChange: true };
  }
}

describe("writes", () => {
  it("setHomeTarget converts °C to the setPoint wire value", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setHomeTarget("DEV1", 21.5);
    expect(c.captured!.query).toContain("requestStateChange");
    expect(c.captured!.variables.id).toBe("DEV1");
    expect(c.captured!.variables.s).toBe('{"setPoint":215}');
  });

  it("setAwayTarget converts °C to the awaySetPoint wire value", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setAwayTarget("DEV1", 13);
    expect(c.captured!.variables.s).toBe('{"awaySetPoint":130}');
  });

  it("setMode writes the OpMode numeric value", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setMode("DEV1", OpMode.Away);
    expect(c.captured!.variables.s).toBe('{"opMode":1}');
  });

  it("rounds fractional °C to the nearest 1/10 on write", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setHomeTarget("DEV1", 21.54);
    expect(c.captured!.variables.s).toBe('{"setPoint":215}');
  });
});
