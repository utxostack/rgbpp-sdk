import { Cell } from '@ckb-lumos/base';
import { Utxo, encodeUtxoId } from '@rgbpp-sdk/btc';
import { leToU128, encodeCellId } from '@rgbpp-sdk/ckb';

export interface AssetSummary {
  amount: bigint;
  utxos: number;
  cells: number;
}

export interface AssetGroupSummary {
  utxoId: string;
  cellIds: string[];
  assets: Record<string, AssetSummary>;
}

export interface TransactionGroupSummary {
  utxos: number;
  cells: number;
  utxoIds: string[];
  cellIds: string[];
  assets: Record<string, AssetSummary>;
}

export class AssetSummarizer {
  groups: AssetGroupSummary[] = [];

  constructor() {}

  addGroup(utxo: Utxo, cells: Cell[]): AssetGroupSummary {
    const utxoId = encodeUtxoId(utxo.txid, utxo.vout);
    const assets: Record<string, Omit<AssetSummary, 'xudtTypeArgs'>> = {};
    const cellIds: string[] = [];

    for (const cell of cells) {
      cellIds.push(encodeCellId(cell.outPoint!.txHash, cell.outPoint!.index));
      const xudtTypeArgs = cell.cellOutput.type?.args ?? 'empty';
      const amount = leToU128(cell.data.substring(0, 34));
      if (assets[xudtTypeArgs] === undefined) {
        assets[xudtTypeArgs] = {
          utxos: 1,
          cells: 0,
          amount: 0n,
        };
      }

      assets[xudtTypeArgs]!.cells += 1;
      assets[xudtTypeArgs]!.amount += amount;
    }

    const result: AssetGroupSummary = {
      utxoId,
      cellIds,
      assets,
    };

    this.groups.push(result);
    return result;
  }

  addGroups(groups: { utxo: Utxo; cells: Cell[] }[]): TransactionGroupSummary {
    const groupResults = groups.map((group) => this.addGroup(group.utxo, group.cells));
    return this.summarizeGroups(groupResults);
  }

  summarizeGroups(groups?: AssetGroupSummary[]): TransactionGroupSummary {
    const targetGroups = groups ?? this.groups;
    const utxoIds = targetGroups.map((summary) => summary.utxoId);
    const cellIds = targetGroups.flatMap((summary) => summary.cellIds);
    const assets = targetGroups.reduce(
      (result, summary) => {
        for (const xudtTypeArgs in summary.assets) {
          if (result[xudtTypeArgs] === undefined) {
            result[xudtTypeArgs] = {
              utxos: 0,
              cells: 0,
              amount: 0n,
            };
          }

          result[xudtTypeArgs]!.utxos += summary.assets[xudtTypeArgs]!.utxos;
          result[xudtTypeArgs]!.cells += summary.assets[xudtTypeArgs]!.cells;
          result[xudtTypeArgs]!.amount += summary.assets[xudtTypeArgs]!.amount;
        }
        return result;
      },
      {} as Record<string, Omit<AssetSummary, 'xudtTypeArgs'>>,
    );

    return {
      utxos: utxoIds.length,
      cells: cellIds.length,
      utxoIds,
      cellIds,
      assets,
    };
  }
}
