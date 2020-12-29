import * as Homey from "homey";

class ConnectedDrive extends Homey.App {

  // eslint-disable-next-line @typescript-eslint/require-await
  async onInit() {
    this.log("ConnectedDrive is running...");
  }

}

module.exports = ConnectedDrive;
