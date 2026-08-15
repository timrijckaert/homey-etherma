import Homey from "homey";
import { OumanCloudClient } from "../../lib/ouman/OumanCloudClient";
import { buildPairedDevices } from "./pairing";

const TENANT = "etherma";

export default class ThermostatDriver extends Homey.Driver {
  async onPair(session: Homey.Driver.PairSession): Promise<void> {
    const client = new OumanCloudClient({ tenant: TENANT });
    let refreshToken = "";

    // login_credentials view -> validate the Etherma e-mail/password via SRP.
    session.setHandler("login", async (data: { username: string; password: string }): Promise<boolean> => {
      refreshToken = await client.login(data.username, data.password);
      return refreshToken.length > 0;
    });

    // list_devices view -> enumerate the account's thermostats.
    session.setHandler("list_devices", async () => {
      const tree = await client.getDeviceTree();
      return buildPairedDevices(tree, refreshToken, TENANT);
    });
  }
}
