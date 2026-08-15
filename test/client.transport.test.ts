import { describe, it, expect, vi } from "vitest";
import { OumanCloudClient } from "../lib/ouman/OumanCloudClient";
import { USERS_ENDPOINT, DEVICE_ENDPOINT, DATA_ENDPOINT } from "./fixtures/discovery";

const FAKE_JWT = "a." + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString("base64url") + ".b";

function routedFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/users/endpoint")) return { ok: true, status: 200, json: async () => USERS_ENDPOINT } as Response;
    if (u.endsWith("/device/endpoint")) return { ok: true, status: 200, json: async () => DEVICE_ENDPOINT } as Response;
    if (u.endsWith("/data/endpoint")) return { ok: true, status: 200, json: async () => DATA_ENDPOINT } as Response;
    if (u.includes("cognito-idp"))
      return { ok: true, status: 200, json: async () => ({ AuthenticationResult: { IdToken: FAKE_JWT } }) } as Response;
    // appsync: echo back the request so the test can assert on it
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { __echo: JSON.parse(init!.body as string), auth: (init!.headers as any).authorization } }),
    } as Response;
  });
}

describe("OumanCloudClient transport", () => {
  it("mints an idToken from the refresh token and sends it as a raw authorization header", async () => {
    const fetchFn = routedFetch();
    const client = new OumanCloudClient({ tenant: "etherma", refreshToken: "RT", fetchFn: fetchFn as unknown as typeof fetch });
    const out: any = await (client as any).gql("device", "query{x}", { a: 1 });
    expect(out.auth).toBe(FAKE_JWT); // raw, no "Bearer "
    expect(out.__echo.query).toBe("query{x}");
    expect(out.__echo.variables).toEqual({ a: 1 });
  });

  it("caches the idToken across calls (one refresh only)", async () => {
    const fetchFn = routedFetch();
    const client = new OumanCloudClient({ tenant: "etherma", refreshToken: "RT", fetchFn: fetchFn as unknown as typeof fetch });
    await client.getIdToken();
    await client.getIdToken();
    const cognitoCalls = fetchFn.mock.calls.filter((c) => String(c[0]).includes("cognito-idp"));
    expect(cognitoCalls.length).toBe(1);
  });

  it("throws when asked for a token without a refresh token", async () => {
    const client = new OumanCloudClient({ tenant: "etherma" });
    await expect(client.getIdToken()).rejects.toThrow(/not authenticated/i);
  });
});
