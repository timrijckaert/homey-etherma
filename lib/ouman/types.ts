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

/** Parsed `reported` desired/reported state (temps are 1/10 °C). */
export interface DeviceState {
  setPoint: number;
  awaySetPoint: number;
  opMode: number;
  displayName: string;
  currentSetPoint: number;
}

/** Parsed live telemetry (temps are 1/10 °C). */
export interface LatestData {
  currentTemp: number;
  roomSensTemp: number;
  floorSensTemp: number;
  currentSetPoint: number;
  relayState: number;
  rssi: number;
}

/** A thermostat discovered in the device tree. */
export interface DeviceSummary {
  id: string;
  name: string;
  zone: string;
}
