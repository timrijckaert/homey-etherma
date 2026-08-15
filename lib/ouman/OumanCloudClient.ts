import { discover } from "./discovery";
import { srpLogin, refreshIdToken } from "./auth";
import type { Endpoints } from "./types";

const REGION = "eu-west-1";

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
}
