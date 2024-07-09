import { Utxo } from '../transaction/utxo.js';

export class DataCache {
  private utxos: Map<string, Utxo[]>; // Map<Key, Utxo[]>

  constructor() {
    this.utxos = new Map();
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
}
