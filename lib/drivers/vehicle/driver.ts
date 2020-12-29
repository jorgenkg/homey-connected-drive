import * as Homey from "homey";
import { ConnectedDrive } from "nodejs-connected-drive";
import { PairSession } from "homey/lib/Driver";
import { VehicleData } from "../../@types/VehicleData";
import { VehicleSettings } from "../../@types/VehicleSettings";
import type { Vehicle } from "./device";

class ConnectedDriveDriver extends Homey.Driver {
  private client?: ConnectedDrive;

  // eslint-disable-next-line @typescript-eslint/require-await
  async onInit() {
    this.log("ConnectedDrive driver started.");

    // eslint-disable-next-line
    this.homey.flow
      .getActionCard("climate")
      // eslint-disable-next-line @typescript-eslint/require-await
      .registerRunListener(async(args: {"vin":string}) => {
        const device = this
          .getDevices()
          .find(d => (d.getData() as VehicleData).vin === args.vin) as Vehicle | undefined;

        if(!device) {
          this.error(`Invalid vehicle vin ${args.vin}. Known ids: ${JSON.stringify(this.getDevices().map(d => (d.getData() as VehicleData)))}`);
          return false;
        }
        else {
          device.climate();
          return true;
        }

      });
  }

  onPair(session: PairSession) {
    let username: string;
    let password: string;

    const vehicles: Array<{
      name: string,
      data: VehicleData,
      settings: VehicleSettings,
    }> = [];

    session.setHandler("login", async(credentials: { username: string, password: string }) => {
      const client = this.client = new ConnectedDrive(credentials.username, credentials.password);

      await client.login();

      this.log("Successfully authenticated with Connected Drive API");

      (username = credentials.username);
      (password = credentials.password);

      return true;
    });

    session.setHandler("list_devices", async() => {
      if(!this.client) {
        throw new Error("Connected Drive client not authenticated");
      }

      this.log("Fetch Connected Drive systems (vehicles).");

      const fetchedVehicles = await this.client.getVehicles();

      this.log(`Fetched ${vehicles.length} vehicles from Connected Drive.`);

      for (const vehicle of fetchedVehicles) {
        const { vehicleRelationship } = await this.client.getStatusOfAllVehicles();

        if(vehicleRelationship.find(({ vin }) => vehicle.vin)?.remoteServiceStatus === "ACTIVE") {
          vehicles.push({
            name: `${vehicle.modelName}`,
            data: { vin: vehicle.vin },
            settings: {
              username,
              password
            }
          });
        }
      }

      return vehicles;
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    session.setHandler("disconnect", async() => {
      this.log("Cleaning up pairing process.");
      delete this.client;
    });
  }
}

module.exports = ConnectedDriveDriver;
