import sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import Homey from "homey";

class EthermaApp extends Homey.App {
  async onInit(): Promise<void> {
    this.log("Etherma app initialised");
  }
}

export = EthermaApp;
