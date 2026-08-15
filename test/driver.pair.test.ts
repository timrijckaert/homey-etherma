import { describe, it, expect } from "vitest";
import { buildPairedDevices } from "../drivers/thermostat/pairing";

describe("buildPairedDevices", () => {
  it("maps a thermostat into a Homey device object with the refresh token in store", () => {
    const out = buildPairedDevices(
      [{ id: "DEV1", name: "bathroom", zone: "bathroom" }],
      "REFRESH123",
      "etherma",
    );
    expect(out).toEqual([
      { name: "bathroom", data: { id: "DEV1" }, store: { refreshToken: "REFRESH123", tenant: "etherma" } },
    ]);
  });

  it("maps multiple thermostats, all carrying the same refresh token", () => {
    const out = buildPairedDevices(
      [
        { id: "A", name: "bathroom", zone: "bathroom" },
        { id: "B", name: "hall", zone: "hall" },
      ],
      "RT",
      "etherma",
    );
    expect(out.map((d) => d.data.id)).toEqual(["A", "B"]);
    expect(out.every((d) => d.store.refreshToken === "RT")).toBe(true);
  });
});
