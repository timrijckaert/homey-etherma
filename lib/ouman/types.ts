export type ServiceName = "users" | "device" | "data" | "events" | "ota";

/** Cognito config for a tenant — only the fields we use for auth. */
export interface UsersConfig {
  clientId: string;
  userPoolId: string;
}

/** A GraphQL service's endpoint. */
export interface ServiceEndpoint {
  endpoint: string;
}

export interface Endpoints {
  users: UsersConfig;
  device: ServiceEndpoint;
  data: ServiceEndpoint;
}

/** Device operating mode. Numeric values match the wire protocol (verified live + against the magneei/heatit reference). */
export enum OpMode {
  Home = 0, // normal heating, uses setPoint
  Away = 1, // reduced, uses awaySetPoint
  TimePlan = 2, // weekly schedule
  AntiFreeze = 3, // frost protection (our "off")
  EnergyMgmt = 4, // energy management
}

/** Reported/desired device state. Temperatures are °C. */
export interface DeviceState {
  setPoint: number; // home comfort target, °C
  awaySetPoint: number; // away/eco target, °C
  opMode: OpMode;
  displayName: string;
}

/** Live telemetry. Temperatures are °C. */
export interface LatestData {
  currentTemp: number; // room air, °C
  floorSensTemp: number; // floor probe, °C
  relayState: number; // heating level, 0-100 % (0 = idle)
  rssi: number; // WiFi signal, dBm
}

/** A thermostat discovered in the device tree. */
export interface DeviceSummary {
  id: string;
  name: string;
  zone: string;
}
