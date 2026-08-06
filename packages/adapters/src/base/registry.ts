import type { AIAdapter, AdapterStatus } from './adapter.js';
import { AdapterError, AdapterInitializationError } from './errors.js';
import { AntigravityAIAdapter } from '../antigravity/antigravity-adapter.js';


export interface AdapterSummary {
  name: string;
  id: string;
  version: string;
  status: AdapterStatus;
  isActive: boolean;
}

export class AdapterRegistry {
  private adapters: Map<string, AIAdapter> = new Map();
  private activeAdapterName: string | null = null;

  public register(name: string, adapter: AIAdapter): void {
    const key = name.toLowerCase().trim();
    if (!key) {
      throw new AdapterError('Adapter name cannot be empty', 'INVALID_ADAPTER_NAME', 'registry');
    }
    if (this.adapters.has(key)) {
      throw new AdapterError(`Adapter '${name}' is already registered`, 'DUPLICATE_ADAPTER', name);
    }
    this.adapters.set(key, adapter);
  }

  public unregister(name: string): boolean {
    const key = name.toLowerCase().trim();
    if (this.activeAdapterName === key) {
      this.activeAdapterName = null;
    }
    return this.adapters.delete(key);
  }

  public get(name: string): AIAdapter | undefined {
    const key = name.toLowerCase().trim();
    return this.adapters.get(key);
  }

  public has(name: string): boolean {
    const key = name.toLowerCase().trim();
    return this.adapters.has(key);
  }

  public list(): AdapterSummary[] {
    const summaries: AdapterSummary[] = [];
    for (const [name, adapter] of this.adapters.entries()) {
      summaries.push({
        name: adapter.name,
        id: adapter.id,
        version: adapter.version,
        status: adapter.status,
        isActive: this.activeAdapterName === name,
      });
    }
    return summaries;
  }

  public setActive(name: string): AIAdapter {
    const key = name.toLowerCase().trim();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new AdapterInitializationError(name, 'Adapter not found in registry');
    }
    this.activeAdapterName = key;
    return adapter;
  }

  public getActive(): AIAdapter | undefined {
    if (!this.activeAdapterName) return undefined;
    return this.adapters.get(this.activeAdapterName);
  }

  public getActiveName(): string | null {
    return this.activeAdapterName;
  }

  public clear(): void {
    this.adapters.clear();
    this.activeAdapterName = null;
  }

  public get size(): number {
    return this.adapters.size;
  }
}

export function registerAntigravityAdapter(
  registry: AdapterRegistry,
  adapter?: AIAdapter
): void {
  const instance = adapter || new AntigravityAIAdapter();
  registry.register('antigravity', instance);
  if (!registry.has('agy')) {
    registry.register('agy', instance);
  }
}

export function createDefaultAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registerAntigravityAdapter(registry);
  return registry;
}

