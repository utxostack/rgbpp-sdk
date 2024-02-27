import { NetworkType } from '../network';
import { UnspentOutput } from '../types';
import { BtcServiceApi } from '../query/btcServiceApi';
import { UniSatOpenApi } from '../query/uniSatOpenApi';
import { addressToScriptPublicKeyHex, getAddressType } from '../address';

export class UtxoSource {
  public source: BtcServiceApi | UniSatOpenApi;
  public networkType: NetworkType;

  constructor(source: BtcServiceApi | UniSatOpenApi, networkType: NetworkType) {
    this.source = source;
    this.networkType = networkType;
  }

  async getUtxos(address: string): Promise<UnspentOutput[]> {
    if (this.source instanceof BtcServiceApi) {
      return getUtxosFromBtcServiceApi(this.source, this.networkType, address);
    } else {
      return getUtxosFromUniSatOpenApi(this.source, address);
    }
  }
}

async function getUtxosFromBtcServiceApi(
  source: BtcServiceApi,
  networkType: NetworkType,
  address: string,
): Promise<UnspentOutput[]> {
  const utxos = await source.getUtxos(address);

  const scriptPk = addressToScriptPublicKeyHex(address, networkType);
  return utxos.map((row): UnspentOutput => {
    return {
      address,
      scriptPk,
      txid: row.txid,
      vout: row.vout,
      value: row.value,
      addressType: getAddressType(address),
    };
  });
}

async function getUtxosFromUniSatOpenApi(source: UniSatOpenApi, address: string): Promise<UnspentOutput[]> {
  const res = await source.getUtxos(address);
  const utxos = res.data.utxo;

  return utxos.map((utxo): UnspentOutput => {
    return {
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.satoshi,
      address: utxo.address,
      scriptPk: utxo.scriptPk,
      addressType: getAddressType(address),
    };
  });
}
