import type { Endpoints, ServiceName } from "./types";

const BASE = (tenant: string): string => `https://${tenant}.api.ouman-cloud.com`;

async function getEndpoint<T>(tenant: string, service: ServiceName, fetchFn: typeof fetch): Promise<T> {
  const res = await fetchFn(`${BASE(tenant)}/${service}/endpoint`);
  if (!res.ok) throw new Error(`discovery failed for ${service}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Fetch a tenant's per-service AppSync endpoints + Cognito config from the
 * public, unauthenticated discovery endpoints. `tenant` is the brand subdomain
 * (e.g. "etherma", "heatit"), so this client is not brand-specific.
 */
export async function discover(tenant: string, fetchFn: typeof fetch = fetch): Promise<Endpoints> {
  const [users, device, data] = await Promise.all([
    getEndpoint<Endpoints["users"]>(tenant, "users", fetchFn),
    getEndpoint<Endpoints["device"]>(tenant, "device", fetchFn),
    getEndpoint<Endpoints["data"]>(tenant, "data", fetchFn),
  ]);
  return { users, device, data };
}
