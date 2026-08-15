import { discover } from "./discovery";
import { srpLogin, refreshIdToken } from "./auth";
import type { Endpoints, DeviceState, LatestData, DeviceSummary } from "./types";

const REGION = "eu-west-1";

/** A node in the getDeviceTree structure (org -> zone -> device). */
interface TreeNode {
  i?: { id?: string; type?: string; state?: { displayName?: string } };
  c?: TreeNode[];
}

/** Depth-first walk collecting THERMOSTAT nodes, tagged with their nearest zone name. */
function walkTree(nodes: TreeNode[], zoneName: string, out: DeviceSummary[]): void {
  for (const node of nodes) {
    const info = node.i ?? {};
    const thisZone = info.state?.displayName ?? zoneName;
    if (info.type === "THERMOSTAT" && info.id) {
      out.push({ id: info.id, name: thisZone || info.id, zone: thisZone });
    }
    if (node.c) walkTree(node.c, thisZone, out);
  }
}

/**
 * Homey-agnostic client for the Ouman cloud (Etherma and its OEM siblings).
 * Handles per-tenant endpoint discovery, Cognito auth (SRP login at pairing,
 * refresh thereafter), and AppSync GraphQL calls with the idToken sent as a
 * raw `authorization` header.
 */
export class OumanCloudClient {
  private readonly tenant: string;
  private readonly fetchFn: typeof fetch;
  private refreshToken?: string;
  private endpoints?: Endpoints;
  private idToken?: string;
  private idTokenExp = 0;

  constructor(opts: { tenant: string; refreshToken?: string; fetchFn?: typeof fetch }) {
    this.tenant = opts.tenant;
    this.refreshToken = opts.refreshToken;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async getEndpoints(): Promise<Endpoints> {
    if (!this.endpoints) this.endpoints = await discover(this.tenant, this.fetchFn);
    return this.endpoints;
  }

  /** SRP e-mail/password login (pairing). Returns the long-lived refresh token. */
  async login(email: string, password: string): Promise<string> {
    const { users } = await this.getEndpoints();
    const res = await srpLogin({ userPoolId: users.userPoolId, clientId: users.clientId, email, password });
    this.refreshToken = res.refreshToken;
    this.idToken = res.idToken;
    this.idTokenExp = res.idTokenExp;
    return res.refreshToken;
  }

  /** Return a valid idToken, refreshing it when within 60s of expiry. */
  async getIdToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.idToken && this.idTokenExp - now > 60) return this.idToken;
    if (!this.refreshToken) throw new Error("Not authenticated: no refresh token");
    const { users } = await this.getEndpoints();
    const res = await refreshIdToken({ region: REGION, clientId: users.clientId, refreshToken: this.refreshToken }, this.fetchFn);
    this.idToken = res.idToken;
    this.idTokenExp = res.idTokenExp;
    return res.idToken;
  }

  /** POST a GraphQL query to a service's AppSync endpoint with the idToken auth header. */
  protected async gql<T>(service: "device" | "data", query: string, variables: object): Promise<T> {
    const endpoints = await this.getEndpoints();
    const idToken = await this.getIdToken();
    const res = await this.fetchFn(endpoints[service].endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: idToken },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await res.json()) as { data?: T; errors?: unknown };
    if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors).slice(0, 200)}`);
    return body.data as T;
  }

  /** Enumerate the account's thermostats (walks the nested org/zone/device tree). */
  async getDeviceTree(): Promise<DeviceSummary[]> {
    const data = await this.gql<{ getDeviceTree: string }>("device", "query{getDeviceTree}", {});
    const roots = JSON.parse(data.getDeviceTree) as TreeNode[];
    const out: DeviceSummary[] = [];
    walkTree(roots, "", out);
    return out;
  }

  /** Read the reported/desired state (setpoints, mode) for a device. */
  async getDeviceState(id: string): Promise<DeviceState> {
    const data = await this.gql<{ getDeviceState: { reported: string } }>(
      "device",
      "query($id:ID!){getDeviceState(deviceId:$id){reported}}",
      { id },
    );
    return JSON.parse(data.getDeviceState.reported) as DeviceState;
  }

  /** Read live telemetry (temps, relay, rssi) for a device. */
  async getLatestData(id: string): Promise<LatestData> {
    const data = await this.gql<{ getLatestData: { data: string } }>(
      "data",
      "query($id:String!){getLatestData(deviceId:$id){data}}",
      { id },
    );
    return JSON.parse(data.getLatestData.data) as LatestData;
  }
}
