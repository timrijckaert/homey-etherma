import { describe, it, expect } from "vitest";
import { refreshIdToken, decodeJwtExp } from "../lib/ouman/auth";

// A JWT whose payload is {"exp":2000000000}
const FAKE_JWT =
  "aaa." + Buffer.from(JSON.stringify({ exp: 2000000000 })).toString("base64url") + ".bbb";

describe("decodeJwtExp", () => {
  it("reads exp from a JWT payload", () => {
    expect(decodeJwtExp(FAKE_JWT)).toBe(2000000000);
  });
});

describe("refreshIdToken", () => {
  it("posts REFRESH_TOKEN_AUTH and returns the new idToken + exp", async () => {
    let captured: any = null;
    const fetchFn = (async (_url: string, init: RequestInit) => {
      captured = JSON.parse(init.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({ AuthenticationResult: { IdToken: FAKE_JWT } }),
      } as Response;
    }) as unknown as typeof fetch;

    const out = await refreshIdToken({ region: "eu-west-1", clientId: "CID", refreshToken: "RT" }, fetchFn);
    expect(captured.AuthFlow).toBe("REFRESH_TOKEN_AUTH");
    expect(captured.ClientId).toBe("CID");
    expect(captured.AuthParameters.REFRESH_TOKEN).toBe("RT");
    expect(out.idToken).toBe(FAKE_JWT);
    expect(out.idTokenExp).toBe(2000000000);
  });

  it("throws when Cognito returns no AuthenticationResult", async () => {
    const fetchFn = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ __type: "NotAuthorizedException" }),
    })) as unknown as typeof fetch;
    await expect(
      refreshIdToken({ region: "eu-west-1", clientId: "CID", refreshToken: "RT" }, fetchFn),
    ).rejects.toThrow(/refresh/i);
  });
});
