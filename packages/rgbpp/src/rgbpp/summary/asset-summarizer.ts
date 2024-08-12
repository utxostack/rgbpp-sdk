import { Cell } from '@ckb-lumos/base';
import { Utxo, encodeUtxoId } from '@rgbpp-sdk/btc';
import { leToU128, encodeCellId } from '@rgbpp-sdk/ckb';

export interface AssetSummary {
  amount: bigint;
  utxoCount: number;
  cellCount: number;
}

export interface AssetGroupSummary {
  utxoId: string;
  cellIds: string[];
  // The key of the assets record is the `xudtTypeArgs` (the unique identifier for the asset type)
  assets: Record<string, AssetSummary>; // Record<xudtTypeAgs, AssetSummary>
}

export interface TransactionGroupSummary {
  utxoCount: number;
  cellCount: number;
  utxoIds: string[];
  cellIds: string[];
  assets: Record<string, AssetSummary>;
}

export class AssetSummarizer {
  groups: AssetGroupSummary[] = [];

  constructor() {}

  addGroup(utxo: Utxo, cells: Cell[]): AssetGroupSummary {
    const utxoId = encodeUtxoId(utxo.txid, utxo.vout);
    const assets: Record<string, AssetSummary> = {};
    const cellIds: string[] = [];

    for (const cell of cells) {
      cellIds.push(encodeCellId(cell.outPoint!.txHash, cell.outPoint!.index));
      const xudtTypeArgs = cell.cellOutput.type?.args ?? 'empty';
      const amount = leToU128(cell.data.substring(0, 34));
      if (assets[xudtTypeArgs] === undefined) {
        assets[xudtTypeArgs] = {
          utxoCount: 1,
          cellCount: 0,
          amount: 0n,
        };
      }

      assets[xudtTypeArgs]!.cellCount += 1;
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

  /**
   * Summarizes asset information across multiple AssetGroupSummary objects.
   * If no groups are provided, it summarizes the internally stored groups.
   *
   * @param groups - Optional array of AssetGroupSummary objects to summarize.
   * @returns TransactionGroupSummary - A summary of all assets across the specified groups,
   *          including total UTXO and cell counts, UTXO and cell IDs, and aggregated asset information.
   */
  summarizeGroups(groups?: AssetGroupSummary[]): TransactionGroupSummary {
    const targetGroups = groups ?? this.groups;
    const utxoIds = targetGroups.map((summary) => summary.utxoId);
    const cellIds = targetGroups.flatMap((summary) => summary.cellIds);
    const assets = targetGroups.reduce(
      (result, summary) => {
        for (const xudtTypeArgs in summary.assets) {
          if (result[xudtTypeArgs] === undefined) {
            result[xudtTypeArgs] = {
              utxoCount: 0,
              cellCount: 0,
              amount: 0n,
            };
          }

          result[xudtTypeArgs]!.utxoCount += summary.assets[xudtTypeArgs]!.utxoCount;
          result[xudtTypeArgs]!.cellCount += summary.assets[xudtTypeArgs]!.cellCount;
          result[xudtTypeArgs]!.amount += summary.assets[xudtTypeArgs]!.amount;
        }
        return result;
      },
      {} as Record<string, AssetSummary>,
    );

    return {
      utxoCount: utxoIds.length,
      cellCount: cellIds.length,
      utxoIds,
      cellIds,
      assets,
    };
  }
}
