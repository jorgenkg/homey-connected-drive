import * as assert from "assert";
import * as Homey from "homey";
import { ConnectedDrive, RemoteService } from "nodejs-connected-drive";
import { VehicleData } from "../../@types/VehicleData";
import { VehicleSettings } from "../../@types/VehicleSettings";

export class Vehicle extends Homey.Device {
  private api?: ConnectedDrive;

  async onInit() {
    const start = Date.now();

    const settings = this.getSettings() as VehicleSettings;
    const data = this.getData() as VehicleData;

    this.api = new ConnectedDrive(settings.username, settings.password, {
      connectedDrive: {
        // The BMW API might take a long time to finish the request
        remoteServiceExecutionTimeoutMs: 1000 * 60 * 3,
        // Prevent sending too many requests in a row. BMW will throttle with HTTP400
        pollIntervalMs: 20000
      },
      logger: {
        info: (msg: string) => this.log(`[Connected Drive: info] ${msg}`),
        warn: (msg: string) => this.log(`[Connected Drive: warn] ${msg}`),
        error: (msg: string) => this.error(`[Connected Drive: error] ${msg}`)
      }
    });

    await this.api?.login();

    this.registerCapabilityListener("button.climate", this.climate.bind(this));
    this.registerCapabilityListener("button.lock", this.lock.bind(this));
    this.registerCapabilityListener("button.unlock", this.unlock.bind(this));

    this.log(`Vehicle ${data.vin} initialized in ${Date.now() - start} ms.`);
  }

  async triggerConnectedDriveService(service: RemoteService) {
    assert(this.api, "Failed to trigger service since the API client isn't initialized");

    const data = this.getData() as VehicleData;

    await this.api.executeRemoteService(data.vin, service);
  }

  climate() {
    this.log(`Triggering climate control in vehicle ${(this.getData() as VehicleData).vin}`);
    setImmediate(async() => {
      try {
        await this.triggerConnectedDriveService(RemoteService.CLIMATE_NOW);
        this.log(`Activated climate control in vehicle ${(this.getData() as VehicleData).vin}`);
      }
      catch(error) {
        await this.setUnavailable((error as Error).message);
      }
    });
  }

  lock() {
    this.log(`Triggering lock in vehicle ${(this.getData() as VehicleData).vin}`);
    setImmediate(async() => {
      try {
        await this.triggerConnectedDriveService(RemoteService.DOOR_LOCK);
        this.log(`Locked vehicle ${(this.getData() as VehicleData).vin}`);
      }
      catch(error) {
        await this.setUnavailable((error as Error).message);
      }
    });
  }

  unlock() {
    this.log(`Triggering unlock in vehicle ${(this.getData() as VehicleData).vin}`);
    setImmediate(async() => {
      try {
        await this.triggerConnectedDriveService(RemoteService.DOOR_UNLOCK);
        this.log(`Unlocked vehicle ${(this.getData() as VehicleData).vin}`);
      }
      catch(error) {
        await this.setUnavailable((error as Error).message);
      }
    });
  }

  async onSettings({
    oldSettings,
    newSettings,
    changedKeys
  }: {
    oldSettings: VehicleSettings,
    newSettings: VehicleSettings,
    changedKeys: (keyof VehicleSettings)[]
  }) {
    const data = this.getData() as VehicleData;

    if(changedKeys.includes("username") || changedKeys.includes("password")) {
      const username = newSettings.username || oldSettings.username;
      const password = newSettings.password || oldSettings.password;

      const newApiConnection = new ConnectedDrive(username, password);
      await newApiConnection.login();

      this.api = newApiConnection;

      this.log(`Updated credentials for Vehicle ${data.vin}`);
    }
  }
}

module.exports = Vehicle;
