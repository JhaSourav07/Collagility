import type { BaseEnvelope } from '@collagility/protocol';

export interface ClientSDKConfig {
  serverUrl: string;
  autoReconnect?: boolean;
}

export class CollagilityClientSDK {
  private config: ClientSDKConfig;

  constructor(config: ClientSDKConfig) {
    this.config = config;
  }

  public getConfig(): ClientSDKConfig {
    return this.config;
  }

  public serializeFrame(frame: BaseEnvelope): string {
    return JSON.stringify(frame);
  }
}
