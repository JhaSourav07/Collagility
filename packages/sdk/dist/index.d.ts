import type { BaseEnvelope } from '@collagility/protocol';
export interface ClientSDKConfig {
    serverUrl: string;
    autoReconnect?: boolean;
}
export declare class CollagilityClientSDK {
    private config;
    constructor(config: ClientSDKConfig);
    getConfig(): ClientSDKConfig;
    serializeFrame(frame: BaseEnvelope): string;
}
//# sourceMappingURL=index.d.ts.map