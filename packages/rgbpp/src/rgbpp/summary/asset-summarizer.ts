import { Cell } from '@ckb-lumos/base';
import { Utxo, encodeUtxoId } from '@rgbpp-sdk/btc';
import { leToU128, encodeCellId, isUDTTypeSupported } from '@rgbpp-sdk/ckb';

export interface AssetGroup {
  utxo: Utxo;
  cells: Cell[];
}

export interface XudtAssetSummary {
  amount: bigint;
  utxoCount: number;
  cellCount: number;
}

export interface AssetGroupSummary {
  utxoId: string;
  cellIds: string[];
  xudtCellIds: string[];
  xudtAssets: Record<string, XudtAssetSummary>; // Record<xudtTypeArgs, AssetSummary>
}

export interface TransactionGroupSummary {
  utxoCount: number;
  cellCount: number;
  xudtCellCount: number;
  utxoIds: string[];
  cellIds: string[];
  xudtCellIds: string[];
  xudtAssets: Record<string, XudtAssetSummary>; // Record<xudtTypeArgs, AssetSummary>
}

export class AssetSummarizer {
  groups: AssetGroupSummary[] = [];

  constructor(public isMainnet: boolean) {}

  addGroup(utxo: Utxo, cells: Cell[], offline: boolean = false): AssetGroupSummary {
    const utxoId = encodeUtxoId(utxo.txid, utxo.vout);

    const cellIds: string[] = [];
    const xudtCellIds: string[] = [];
    const xudtAssets: Record<string, XudtAssetSummary> = {};
    for (const cell of cells) {
      const cellId = encodeCellId(cell.outPoint!.txHash, cell.outPoint!.index);
      cellIds.push(cellId);

      const isXudt = !!cell.cellOutput.type && isUDTTypeSupported(cell.cellOutput.type, this.isMainnet, offline);
      if (isXudt) {
        // If the cell type is a supported xUDT type, record its asset information
        const xudtTypeArgs = cell.cellOutput.type?.args ?? 'empty';
        const amount = leToU128(cell.data.substring(0, 34));
        if (xudtAssets[xudtTypeArgs] === undefined) {
          xudtAssets[xudtTypeArgs] = {
            utxoCount: 1,
            cellCount: 0,
            amount: 0n,
          };
        }

        xudtCellIds.push(cellId);
        xudtAssets[xudtTypeArgs]!.cellCount += 1;
        xudtAssets[xudtTypeArgs]!.amount += amount;
      } else {
        // TODO: if the cell type is empty or is not xUDT, how to handle/record its info?
      }
    }

    const result: AssetGroupSummary = {
      utxoId,
      cellIds,
      xudtCellIds,
      xudtAssets,
    };

    this.groups.push(result);
    return result;
  }

  addGroups(groups: AssetGroup[], offline: boolean = false): TransactionGroupSummary {
    const groupResults = groups.map((group) => this.addGroup(group.utxo, group.cells, offline));
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
    const xudtCellIds = targetGroups.flatMap((summary) => summary.xudtCellIds);
    const xudtAssets = targetGroups.reduce(
      (result, summary) => {
        for (const xudtTypeArgs in summary.xudtAssets) {
          if (!result[xudtTypeArgs]) {
            result[xudtTypeArgs] = {
              utxoCount: 0,
              cellCount: 0,
              amount: 0n,
            };
          }

          result[xudtTypeArgs]!.utxoCount += summary.xudtAssets[xudtTypeArgs]!.utxoCount;
          result[xudtTypeArgs]!.cellCount += summary.xudtAssets[xudtTypeArgs]!.cellCount;
          result[xudtTypeArgs]!.amount += summary.xudtAssets[xudtTypeArgs]!.amount;
        }
        return result;
      },
      {} as Record<string, XudtAssetSummary>,
    );

    return {
      utxoCount: utxoIds.length,
      cellCount: cellIds.length,
      xudtCellCount: xudtCellIds.length,
      utxoIds,
      cellIds,
      xudtCellIds,
      xudtAssets,
    };
  }
}
