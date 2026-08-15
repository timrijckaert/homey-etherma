// Real field shapes captured live 2026-08-15. Identifiers sanitized — no real
// device UUID / organisation id / MAC / serial reaches the public repo. The
// numeric values (temps, setpoints, opMode) are kept real so the parsing tests
// reflect actual data.

export const DEVICE_STATE_REPORTED = JSON.stringify({
  deviceId: "DEV1",
  setPoint: 395, // 39.5 °C home comfort target (a floor target)
  setRegP: 10,
  awaySetPoint: 55, // 5.5 °C away/frost target
  tempUnit: 0, // Celsius
  opMode: 1, // Away
  displayName: "badkamer ",
  currentSetPoint: 55, // == awaySetPoint since opMode=1
  devType: "EE-MOD-WIFI-TFT",
  macAddr: "AABBCCDDEEFF",
  serialNum: "0000000000",
  online: true,
  swVer: "1.0.10",
  expired: false,
});

export const LATEST_DATA = JSON.stringify({
  subDevices: [],
  currentSetPoint: 55,
  currentTemp: 268, // 26.8 °C (== roomSensTemp; the app's "current temperature")
  deviceState: 261,
  floorSensTemp: 238, // 23.8 °C
  relayOnTime: 247155,
  relayState: 0,
  roomSensTemp: 268,
  roomSensTempRaw: 304,
  rssi: -45,
  compSensTemp: 317,
  espSensorTemp: 340,
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
