import { describe, it, expect } from "vitest";
import { discover } from "../lib/ouman/discovery";
import { USERS_ENDPOINT, DEVICE_ENDPOINT, DATA_ENDPOINT } from "./fixtures/discovery";

function fakeFetch(map: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const key = String(url).split("/").slice(-2)[0]; // "users" | "device" | "data"
    return { ok: true, status: 200, json: async () => map[key] } as Response;
  }) as unknown as typeof fetch;
}

describe("discover", () => {
  it("fetches the three service endpoints for a tenant", async () => {
    const fetchFn = fakeFetch({ users: USERS_ENDPOINT, device: DEVICE_ENDPOINT, data: DATA_ENDPOINT });
    const result = await discover("etherma", fetchFn);
    expect(result.users.userPoolId).toBe("eu-west-1_vackkq6yo");
    expect(result.users.clientId).toBe("78qefuad2epg9gr53d75lg80nc");
    expect(result.device.endpoint).toContain("qieqarizvvb3hmbnk47g2x32ea");
    expect(result.data.endpoint).toContain("yjyv2dc47fab5pdd3qck4wkndi");
  });

  it("builds the URL from the tenant", async () => {
    const seen: string[] = [];
    const fetchFn = (async (url: string) => {
      seen.push(String(url));
      const key = String(url).split("/").slice(-2)[0];
      return { ok: true, status: 200, json: async () => ({ users: USERS_ENDPOINT, device: DEVICE_ENDPOINT, data: DATA_ENDPOINT } as Record<string, unknown>)[key] } as Response;
    }) as unknown as typeof fetch;
    await discover("heatit", fetchFn);
    expect(seen).toContain("https://heatit.api.ouman-cloud.com/users/endpoint");
  });

  it("throws a clear error on a non-200", async () => {
    const fetchFn = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(discover("etherma", fetchFn)).rejects.toThrow(/discovery failed/i);
  });
});
