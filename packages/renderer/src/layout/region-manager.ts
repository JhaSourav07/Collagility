export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  clip?: boolean;
}

export class RegionManager {
  private regions: Map<string, RegionBounds> = new Map();
  public screenWidth: number;
  public screenHeight: number;

  constructor(screenWidth = 80, screenHeight = 24) {
    this.screenWidth = Math.max(1, screenWidth);
    this.screenHeight = Math.max(1, screenHeight);
  }

  public registerRegion(id: string, bounds: RegionBounds): void {
    this.regions.set(id, {
      x: Math.max(0, bounds.x),
      y: Math.max(0, bounds.y),
      width: Math.max(1, Math.min(bounds.width, this.screenWidth - bounds.x)),
      height: Math.max(1, Math.min(bounds.height, this.screenHeight - bounds.y)),
      clip: bounds.clip ?? true,
    });
  }

  public getRegion(id: string): RegionBounds | undefined {
    return this.regions.get(id);
  }

  public updateScreenDimensions(width: number, height: number): void {
    this.screenWidth = Math.max(1, width);
    this.screenHeight = Math.max(1, height);
    for (const [id, bounds] of this.regions.entries()) {
      this.registerRegion(id, bounds);
    }
  }

  public isPointInRegion(id: string, x: number, y: number): boolean {
    const region = this.regions.get(id);
    if (!region) return false;
    return (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    );
  }
}
