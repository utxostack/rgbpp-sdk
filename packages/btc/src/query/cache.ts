import { Utxo } from '../transaction/utxo';

export class DataCache {
  private utxos: Map<string, Utxo[]>; // Map<Key, Utxo[]>
  private hasRgbppAssets: Map<string, boolean>; // Map<`{txid}:{vout}`, HasAssets>

  constructor() {
    this.utxos = new Map();
    this.hasRgbppAssets = new Map();
  }

  setUtxos(key: string, utxos: Utxo[]) {
    this.utxos.set(key, utxos);
  }
  getUtxos(key: string): Utxo[] | undefined {
    return this.utxos.get(key);
  }
  cleanUtxos(key: string) {
    if (this.utxos.has(key)) {
      this.utxos.delete(key);
    }
  }
  async optionalCacheUtxos(props: { key?: string; getter: () => Promise<Utxo[]> | Utxo[] }): Promise<Utxo[]> {
    if (props.key && this.utxos.has(props.key)) {
      return this.getUtxos(props.key) as Utxo[];
    }

    const utxos = await props.getter();
    if (props.key) {
      this.setUtxos(props.key, utxos);
    }

    return utxos;
  }

  setHasRgbppAssets(key: string, hasAssets: boolean) {
    this.hasRgbppAssets.set(key, hasAssets);
  }
  getHasRgbppAssets(key: string): boolean | undefined {
    return this.hasRgbppAssets.get(key);
  }
  cleanHasRgbppAssets(key: string) {
    if (this.hasRgbppAssets.has(key)) {
      this.hasRgbppAssets.delete(key);
    }
  }
  async optionalCacheHasRgbppAssets(props: {
    key?: string;
    getter: () => Promise<boolean> | boolean;
  }): Promise<boolean> {
    if (props.key && this.hasRgbppAssets.has(props.key)) {
      return this.getHasRgbppAssets(props.key) as boolean;
    }

    const hasRgbppAssets = await props.getter();
    if (props.key) {
      this.setHasRgbppAssets(props.key, hasRgbppAssets);
    }

    return hasRgbppAssets;
  }
}
