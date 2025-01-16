import {
  encodeCellId,
  isScriptEqual,
  getXudtTypeScript,
  isUDTTypeSupported,
  buildRgbppLockArgs,
  unpackRgbppLockArgs,
  genBtcTransferCkbVirtualTx,
  RGBPP_TX_INPUTS_MAX_LENGTH,
} from '@rgbpp-sdk/ckb';
import {
  Utxo,
  BaseOutput,
  encodeUtxoId,
  decodeUtxoId,
  limitPromiseBatchSize,
  createSendRgbppUtxosBuilder,
} from '@rgbpp-sdk/btc';
import { bytes } from '@ckb-lumos/codec';
import { blockchain, Cell } from '@ckb-lumos/base';
import { groupNumbersBySum, mapGroupsByIndices } from '../utils/group';
import { RgbppTransferAllTxGroup, RgbppTransferAllTxsParams, RgbppTransferAllTxsResult } from '../types/xudt';
import { AssetSummarizer } from '../summary/asset-summarizer';
import { RgbppError, RgbppErrorCodes } from '../error';

/**
 * Build BTC/CKB transaction group(s) to transfer all amount of an RGB++ XUDT asset from the specified BTC addresses to the target BTC address.
 * Due to the input size limitation, each CKB transaction can contain up to 40 RGB++ cells.
 * Therefore, the generated result may contain more than one transaction group.
 */
export async function buildRgbppTransferAllTxs(params: RgbppTransferAllTxsParams): Promise<RgbppTransferAllTxsResult> {
  // Prepare base props
  const maxRgbppCellsPerCkbTx = RGBPP_TX_INPUTS_MAX_LENGTH;
  const isMainnet = params.isMainnet;
  const btcSource = params.btc.dataSource;
  const btcService = btcSource.service;
  const ckbCollector = params.ckb.collector;
  const typeScript = params.ckb.compatibleXudtTypeScript ?? {
    ...getXudtTypeScript(isMainnet),
    args: params.ckb.xudtTypeArgs,
  };
  const xudtTypeHex = bytes.hexify(blockchain.Script.pack(typeScript));

  // Get L2 Cells own by the assetAccounts,
  // and build L1 UTXO IDs (`${txid}:${vout}`) from each cell.cellOutput.lock.args
  const accountCells = await Promise.all(
    params.btc.assetAddresses.map((address) => {
      return limitPromiseBatchSize(() =>
        btcService.getRgbppAssetsByBtcAddress(address, {
          type_script: xudtTypeHex,
        }),
      );
    }),
  );
  const utxoIds = new Set<string>(
    accountCells.flat().map((rgbppCell) => {
      const lockArgs = unpackRgbppLockArgs(rgbppCell.cellOutput.lock.args);
      return encodeUtxoId(lockArgs.btcTxId, lockArgs.outIndex);
    }),
  );

  // Get all L1 UTXOs from the asset accounts
  const accountUtxos = await Promise.all(
    params.btc.assetAddresses.map((address) => {
      return limitPromiseBatchSize(() => btcSource.getUtxos(address));
    }),
  );

  // Storage variables for cache querying
  const invalidUtxoIds = new Set<string>(); // Set<UtxoId>
  const cellsMap = new Map<string, Cell[]>(); // Map<UtxoId, Cell[]>
  const utxosMap = new Map<string, Utxo>(); // Map<CellId, Utxo>
  const cellMap = new Map<string, Cell>(); // Map<CellId, Cell>
  const utxoMap = accountUtxos.flat().reduce(
    // Map<UtxoId, Utxo>
    (map, utxo) => {
      const utxoId = encodeUtxoId(utxo.txid, utxo.vout);
      if (utxoIds.has(utxoId)) {
        map.set(utxoId, utxo);
      }
      return map;
    },
    new Map<string, Utxo>(),
  );

  // Get each L1 UTXO's corresponding L2 Cells
  // If a UTXO has more L2 Cells than maxRgbppCellsPerCkbTx, the UTXO/Cells are invalid.
  // Invalid L1 UTXO and its corresponding L2 Cells are excluded from the transfer process.
  const rgbppGroups: { id: string; cells: number }[] = [];
  await Promise.all(
    [...utxoIds].map(async (utxoId) => {
      return limitPromiseBatchSize(async () => {
        const { txid, vout } = decodeUtxoId(utxoId);
        const cells = await btcService.getRgbppAssetsByBtcUtxo(txid, vout);
        if (cells) {
          cellsMap.set(utxoId, cells);
        }
        const utxo = utxoMap.get(utxoId);
        const hasUnsupportedTypeCell = await Promise.any(
          cells.map(async (cell) => {
            return cell.cellOutput.type && !(await isUDTTypeSupported(cell.cellOutput.type, isMainnet));
          }),
        );
        if (!utxo || !cells || cells.length > maxRgbppCellsPerCkbTx || hasUnsupportedTypeCell) {
          invalidUtxoIds.add(utxoId);
          return;
        }
        cells.forEach((cell) => {
          const cellId = encodeCellId(cell.outPoint!.txHash, cell.outPoint!.index);
          utxosMap.set(cellId, utxo);
          cellMap.set(cellId, cell);
        });
        rgbppGroups.push({
          id: utxoId,
          cells: cells.length,
        });
      });
    }),
  );

  // Relocate UTXO/Cells groups for constructing transactions later, the rules:
  // 1. All Cells corresponding to the same UTXO should be included in the same CKB_VTX
  // 2. Each CKB_VTX can only include (<= maxRgbppCellsPerCkbTx) amount of Cells
  const boundCells = rgbppGroups.map((group) => group.cells);
  const groupedByInputs = groupNumbersBySum(boundCells, maxRgbppCellsPerCkbTx);
  const groupedAssetGroups = mapGroupsByIndices(groupedByInputs.indices, (index) => rgbppGroups[index]!);

  // Construct transaction groups
  const summarizer = new AssetSummarizer(isMainnet);
  const usedBtcUtxos: BaseOutput[] = [];
  const transactionGroups: RgbppTransferAllTxGroup[] = [];
  for (const assetGroups of groupedAssetGroups) {
    // Collect summary of the assets group, including XUDT amounts
    const groupSummary = await summarizer.addGroups(
      assetGroups.map((group) => ({
        utxo: utxoMap.get(group.id)!,
        cells: cellsMap.get(group.id)!,
      })),
    );

    // Props for constructing CKB_VTX
    const xudtAmount = groupSummary.xudtAssets[params.ckb.xudtTypeArgs]!.amount;
    const lockArgsList = groupSummary.utxoIds.map((utxoId) => {
      const output = decodeUtxoId(utxoId)!;
      return buildRgbppLockArgs(output.vout, output.txid);
    });

    // Construct CKB_VTX
    const ckbVtxResult = await genBtcTransferCkbVirtualTx({
      collector: ckbCollector,
      xudtTypeBytes: xudtTypeHex,
      transferAmount: xudtAmount,
      rgbppLockArgsList: lockArgsList,
      btcTestnetType: params.btc.testnetType,
      isMainnet,
    });

    // Generate an address list of the non-target RGBPP cells,
    // because non-target RGBPP cells should be returned one-to-one to their original owners
    const nonTargetTos = ckbVtxResult.ckbRawTx.inputs.reduce((utxos, input) => {
      const cellId = encodeCellId(input.previousOutput!.txHash, input.previousOutput!.index);
      const cell = cellMap.get(cellId)!;
      if (!cell.cellOutput.type || !isScriptEqual(cell.cellOutput.type!, xudtTypeHex)) {
        const utxo = utxosMap.get(cellId)!;
        utxos.push(utxo.address);
      }
      return utxos;
    }, [] as string[]);

    // Expect the CKB_TX's outputs to be [transferRgbppCell, ...nonTargetRgbppCells].
    // All collected XUDT amount will be compact into a single cell, so no change cell is expected.
    const expectCkbOutputsLength = nonTargetTos.length + 1;
    const ckbOutputsLength = ckbVtxResult.ckbRawTx.outputs.length;
    if (ckbVtxResult.ckbRawTx.outputs.length !== expectCkbOutputsLength) {
      throw RgbppError.withComment(
        RgbppErrorCodes.UNEXPECTED_CKB_VTX_OUTPUTS_LENGTH,
        `expected: ${expectCkbOutputsLength}, actual: ${ckbOutputsLength}`,
      );
    }

    // Construct BTC_TX
    const { builder, fee, feeRate } = await createSendRgbppUtxosBuilder({
      // CKB
      ckbCollector: params.ckb.collector,
      ckbVirtualTx: ckbVtxResult.ckbRawTx,
      commitment: ckbVtxResult.commitment,
      tos: [params.btc.toAddress, ...nonTargetTos],
      // BTC
      from: params.btc.fromAddress,
      fromPubkey: params.btc.fromPubkey,
      changeAddress: params.btc.changeAddress,
      pubkeyMap: params.btc.pubkeyMap,
      feeRate: params.btc.feeRate,
      excludeUtxos: usedBtcUtxos,
      source: btcSource,
    });

    // Exclude used BTC UTXOs in the next BTC_TX
    const psbt = builder.toPsbt();
    for (let i = groupSummary.utxoIds.length; i < builder.inputs.length; i++) {
      const vin = builder.inputs[i];
      if (vin) {
        usedBtcUtxos.push({
          txid: vin.utxo.txid,
          vout: vin.utxo.vout,
        });
      }
    }

    // Add generated BTC_TX and CKB_VTX to the groups
    transactionGroups.push({
      ckb: {
        virtualTxResult: ckbVtxResult,
      },
      btc: {
        psbtHex: psbt.toHex(),
        feeRate,
        fee,
      },
      summary: groupSummary,
    });
  }

  // Generate result
  const excludedSummarizer = new AssetSummarizer(isMainnet);
  excludedSummarizer.addGroups(
    [...invalidUtxoIds].map((utxoId) => ({
      utxo: utxoMap.get(utxoId)!,
      cells: cellsMap.get(utxoId)!,
    })),
  );
  return {
    transactions: transactionGroups,
    summary: {
      included: summarizer.summarizeGroups(),
      excluded: excludedSummarizer.summarizeGroups(),
    },
  };
}
