import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { srpLogin, refreshIdToken } from "../lib/ouman/auth";

// Opt-in integration test. Skipped unless a gitignored env.json with real
// Etherma credentials is present. This is the SRP spike: the only proof that
// login works against the live Cognito pool.
const creds: { ETHERMA_EMAIL?: string; ETHERMA_PASSWORD?: string } | null = (() => {
  try {
    return JSON.parse(readFileSync("env.json", "utf8"));
  } catch {
    return null;
  }
})();

const maybe = creds?.ETHERMA_EMAIL ? describe : describe.skip;

maybe("live SRP login (requires env.json)", () => {
  it("logs in via SRP and can refresh the idToken", async () => {
    const login = await srpLogin({
      userPoolId: "eu-west-1_vackkq6yo",
      clientId: "78qefuad2epg9gr53d75lg80nc",
      email: creds!.ETHERMA_EMAIL!,
      password: creds!.ETHERMA_PASSWORD!,
    });
    expect(login.refreshToken.length).toBeGreaterThan(20);

    const refreshed = await refreshIdToken({
      region: "eu-west-1",
      clientId: "78qefuad2epg9gr53d75lg80nc",
      refreshToken: login.refreshToken,
    });
    expect(refreshed.idTokenExp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
