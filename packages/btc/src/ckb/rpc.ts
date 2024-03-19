import { Cell, OutPoint, RPC } from '@ckb-lumos/lumos';
import { CKBComponents } from '@ckb-lumos/lumos/rpc';

/**
 * Query a specific cell (with status) via CKB RPC.getLiveCell() method.
 */
export async function getCellByOutPoint(
  outPoint: OutPoint,
  rpc: RPC,
): Promise<{
  cell?: Cell;
  status: CKBComponents.CellStatus;
}> {
  const liveCell = await rpc.getLiveCell(outPoint, true);
  const cell: Cell | undefined = liveCell.cell
    ? {
        outPoint,
        cellOutput: liveCell.cell.output,
        data: liveCell.cell.data.content,
      }
    : void 0;

  return {
    cell,
    status: liveCell.status,
  };
}
