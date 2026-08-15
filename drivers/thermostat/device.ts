import Homey from "homey";
import { OumanCloudClient } from "../../lib/ouman/OumanCloudClient";
import { OpMode } from "../../lib/ouman/types";
import { opModeToId, idToOpMode, isPowerOn, isHeating, type ModeId } from "./mapping";

const POLL_MS = 5 * 60 * 1000; // TODO: expose as a device setting

class ThermostatDevice extends Homey.Device {
  private client!: OumanCloudClient;
  private pollTimer?: NodeJS.Timeout;

  async onInit(): Promise<void> {
    const refreshToken = this.getStoreValue("refreshToken") as string;
    const tenant = (this.getStoreValue("tenant") as string) ?? "etherma";
    this.client = new OumanCloudClient({ tenant, refreshToken });

    this.registerCapabilityListener("target_temperature", (v: number) => this.onTarget(v));
    this.registerCapabilityListener("target_temperature.home", (v: number) => this.client.setHomeTarget(this.id(), v));
    this.registerCapabilityListener("target_temperature.away", (v: number) => this.client.setAwayTarget(this.id(), v));
    this.registerCapabilityListener("etherma_mode", (v: ModeId) => this.onMode(idToOpMode(v)));
    this.registerCapabilityListener("onoff", (v: boolean) => this.onMode(v ? OpMode.Home : OpMode.AntiFreeze));

    await this.poll();
    this.pollTimer = this.homey.setInterval(() => this.poll().catch((e) => this.error(e)), POLL_MS);
  }

  async onUninit(): Promise<void> {
    this.stopPoll();
  }

  async onDeleted(): Promise<void> {
    this.stopPoll();
  }

  private stopPoll(): void {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
  }

  private id(): string {
    return (this.getData() as { id: string }).id;
  }

  private async poll(): Promise<void> {
    try {
      const [state, latest] = await Promise.all([
        this.client.getDeviceState(this.id()),
        this.client.getLatestData(this.id()),
      ]);
      await this.setCapabilityValue("measure_temperature", latest.currentTemp);
      await this.setCapabilityValue("measure_temperature.floor", latest.floorSensTemp);
      await this.setCapabilityValue("target_temperature", state.currentSetPoint);
      await this.setCapabilityValue("target_temperature.home", state.setPoint);
      await this.setCapabilityValue("target_temperature.away", state.awaySetPoint);
      await this.setCapabilityValue("etherma_mode", opModeToId(state.opMode));
      await this.setCapabilityValue("onoff", isPowerOn(state.opMode));
      await this.setCapabilityValue("etherma_heating", isHeating(latest.relayState));
      await this.setCapabilityValue("etherma_heating_level", latest.relayState);
      await this.setCapabilityValue("etherma_signal", latest.rssi);
      await this.setAvailable();
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (/refresh|NotAuthorized|authenticated/i.test(msg)) {
        await this.setUnavailable("Login expired — please re-pair this device.");
      } else {
        await this.setUnavailable("Etherma cloud unreachable — retrying next poll.");
      }
      throw err;
    }
  }

  /** Main target tile: write the setpoint that matches the current mode. */
  private async onTarget(celsius: number): Promise<void> {
    const state = await this.client.getDeviceState(this.id());
    if (state.opMode === OpMode.Away) {
      await this.client.setAwayTarget(this.id(), celsius);
      await this.setCapabilityValue("target_temperature.away", celsius).catch(() => {});
    } else {
      await this.client.setHomeTarget(this.id(), celsius);
      await this.setCapabilityValue("target_temperature.home", celsius).catch(() => {});
    }
  }

  /** Change mode (from the mode picker or the on/off toggle) and keep both in sync. */
  private async onMode(mode: OpMode): Promise<void> {
    await this.client.setMode(this.id(), mode);
    await this.setCapabilityValue("etherma_mode", opModeToId(mode)).catch(() => {});
    await this.setCapabilityValue("onoff", isPowerOn(mode)).catch(() => {});
  }
}

export = ThermostatDevice;
