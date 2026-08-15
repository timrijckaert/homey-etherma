import { describe, it, expect } from "vitest";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";

// Capture the transport call so we can assert the exact payload shaping.
class CaptureClient extends OumanCloudClient {
  public captured: { query: string; variables: any } | null = null;
  protected async gql(_service: any, query: string, variables: any): Promise<any> {
    this.captured = { query, variables };
    return { requestStateChange: true };
  }
}

describe("writes", () => {
  it("shapes a setPoint write as an AWSJSON partial state", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setSetPoint("DEV1", "setPoint", 215);
    expect(c.captured!.query).toContain("requestStateChange");
    expect(c.captured!.variables.id).toBe("DEV1");
    expect(c.captured!.variables.s).toBe('{"setPoint":215}');
  });

  it("shapes an awaySetPoint write", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setSetPoint("DEV1", "awaySetPoint", 130);
    expect(c.captured!.variables.s).toBe('{"awaySetPoint":130}');
  });

  it("shapes an opMode write", async () => {
    const c = new CaptureClient({ tenant: "etherma", refreshToken: "RT" });
    await c.setOpMode("DEV1", 1);
    expect(c.captured!.variables.s).toBe('{"opMode":1}');
  });
});
