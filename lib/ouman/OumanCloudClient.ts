import { discover } from "./discovery";
import { srpLogin, refreshIdToken } from "./auth";
import { OpMode } from "./types";
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

  /** Read the reported/desired state, normalized to °C and a typed OpMode. */
  async getDeviceState(id: string): Promise<DeviceState> {
    const data = await this.gql<{ getDeviceState: { reported: string } }>(
      "device",
      "query($id:ID!){getDeviceState(deviceId:$id){reported}}",
      { id },
    );
    const r = JSON.parse(data.getDeviceState.reported);
    return {
      setPoint: r.setPoint / 10,
      awaySetPoint: r.awaySetPoint / 10,
      currentSetPoint: r.currentSetPoint / 10,
      opMode: r.opMode as OpMode,
      displayName: r.displayName,
    };
  }

  /** Read live telemetry, temps normalized to °C. relayState is 0-100 %. */
  async getLatestData(id: string): Promise<LatestData> {
    const data = await this.gql<{ getLatestData: { data: string } }>(
      "data",
      "query($id:String!){getLatestData(deviceId:$id){data}}",
      { id },
    );
    const d = JSON.parse(data.getLatestData.data);
    return {
      currentTemp: d.currentTemp / 10,
      floorSensTemp: d.floorSensTemp / 10,
      relayState: d.relayState,
      rssi: d.rssi,
    };
  }

  /** Send a partial desired-state change (AWSJSON), e.g. {"setPoint":215}. */
  private async requestStateChange(id: string, partial: Record<string, number>): Promise<void> {
    await this.gql<{ requestStateChange: unknown }>(
      "device",
      "mutation($id:ID!,$s:AWSJSON!){requestStateChange(deviceId:$id,state:$s,getFullState:false)}",
      { id, s: JSON.stringify(partial) },
    );
  }

  /** Set the home comfort target, in °C. */
  async setHomeTarget(id: string, celsius: number): Promise<void> {
    await this.requestStateChange(id, { setPoint: Math.round(celsius * 10) });
  }

  /** Set the away/eco target, in °C. */
  async setAwayTarget(id: string, celsius: number): Promise<void> {
    await this.requestStateChange(id, { awaySetPoint: Math.round(celsius * 10) });
  }

  /** Set the operating mode. */
  async setMode(id: string, mode: OpMode): Promise<void> {
    await this.requestStateChange(id, { opMode: mode });
  }
}
