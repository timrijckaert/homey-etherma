export type ServiceName = "users" | "device" | "data" | "events" | "ota";

export interface UsersEndpoint {
  endpoint: string;
  clientId: string;
  userPoolId: string;
  identityPoolId: string;
  minClientVersion: string;
}

export interface ServiceEndpoint {
  endpoint: string;
  minClientVersion: string;
}

export interface Endpoints {
  users: UsersEndpoint;
  device: ServiceEndpoint;
  data: ServiceEndpoint;
}
