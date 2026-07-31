export class CollagilityClientSDK {
    config;
    constructor(config) {
        this.config = config;
    }
    getConfig() {
        return this.config;
    }
    serializeFrame(frame) {
        return JSON.stringify(frame);
    }
}
//# sourceMappingURL=index.js.map