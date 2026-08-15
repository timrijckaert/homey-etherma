// Real field shapes captured live 2026-08-15 (a "Home / heating" snapshot).
// Identifiers sanitized — no real device UUID / organisation id / MAC / serial
// reaches the public repo. Numeric values are raw wire values (temps in 1/10 °C,
// relayState as a 0-100 percentage); the client normalizes them.

export const DEVICE_STATE_REPORTED = JSON.stringify({
  deviceId: "DEV1",
  setPoint: 400, // 40.0 °C home comfort target (a floor target)
  setRegP: 10,
  awaySetPoint: 55, // 5.5 °C away/frost target
  tempUnit: 0, // Celsius
  opMode: 0, // Home
  displayName: "badkamer ",
  currentSetPoint: 400,
  devType: "EE-MOD-WIFI-TFT",
  macAddr: "AABBCCDDEEFF",
  serialNum: "0000000000",
  online: true,
  swVer: "1.0.10",
  expired: false,
});

export const LATEST_DATA = JSON.stringify({
  subDevices: [],
  currentSetPoint: 400,
  currentTemp: 260, // 26.0 °C (room; the app's "current temperature")
  deviceState: 5,
  floorSensTemp: 239, // 23.9 °C
  relayOnTime: 247282,
  relayState: 100, // heating at 100% (0-100 scale, NOT 0/1)
  roomSensTemp: 260,
  roomSensTempRaw: 303,
  rssi: -46,
  compSensTemp: 337,
  espSensorTemp: 339,
});

// getDeviceTree returns an AWSJSON *string* of a nested org -> zone -> device tree.
const TREE = [
  {
    i: { id: "ORG1", attr: [] },
    t: 1,
    c: [
      {
        i: {
          id: "ZONE1",
          attr: [{ key: "type", value: "ZONE" }],
          state: { displayName: "bathroom", groupName: "ZONE1", timestamp: 1775654293994 },
        },
        t: 2,
        c: [
          {
            i: {
              id: "DEV1",
              attr: [
                { key: "devType", value: "EE-MOD-WIFI-TFT" },
                { key: "macAddr", value: "AABBCCDDEEFF" },
                { key: "parentId", value: "ZONE1" },
                { key: "serialNum", value: "0000000000" },
              ],
              type: "THERMOSTAT",
            },
            t: 0,
          },
        ],
      },
    ],
  },
];

export const DEVICE_TREE_JSON = JSON.stringify(TREE);
