import { describe, it, expect } from 'vitest';
import {
  calculateRgbppCellCapacity,
  calculateRgbppClusterCellCapacity,
  calculateRgbppSporeCellCapacity,
  calculateTransactionFee,
  deduplicateList,
  generateUniqueTypeArgs,
  isClusterSporeTypeSupported,
  isLockArgsSizeExceeded,
  isScriptEqual,
  isTypeAssetSupported,
  checkCkbTxInputsCapacitySufficient,
  calculateCellOccupiedCapacity,
  isSporeCapacitySufficient,
} from './ckb-tx';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';
import { Collector } from '../collector';
import { NoLiveCellError } from '../error';
import { utf8ToHex } from './hex';
import { IndexerCell } from '../types';

describe('ckb tx utils', () => {
  it('calculateTransactionFee', () => {
    const fee1 = calculateTransactionFee(1245);
    expect(BigInt(1370)).toBe(fee1);

    const fee2 = calculateTransactionFee(1245, BigInt(1200));
    expect(BigInt(1494)).toBe(fee2);
  });

  it('calculateTransactionFee', () => {
    const longLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399';
    expect(true).toBe(isLockArgsSizeExceeded(longLockArgs));

    const shortLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3';
    expect(false).toBe(isLockArgsSizeExceeded(shortLockArgs));
  });

  it('calculateRgbppCellCapacity', () => {
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    const capacity = calculateRgbppCellCapacity(xudtType);
    expect(BigInt(254_0000_0000)).toBe(capacity);

    const actual = calculateRgbppCellCapacity();
    expect(actual).toBe(BigInt(254_0000_0000));
  });

  it('isClusterSporeTypeSupported', () => {
    const clusterTestnetType: CKBComponents.Script = {
      codeHash: '0x0bbe768b519d8ea7b96d58f1182eb7e6ef96c541fbd9526975077ee09f049058',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(clusterTestnetType, false)).toBe(true);

    const clusterMainnetType: CKBComponents.Script = {
      codeHash: '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(clusterMainnetType, true)).toBe(true);

    const sporeTestnetType: CKBComponents.Script = {
      codeHash: '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(sporeTestnetType, false)).toBe(true);

    const sporeMainnetType: CKBComponents.Script = {
      codeHash: '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(sporeMainnetType, true)).toBe(true);

    const sporeMainnetErrorType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(sporeMainnetErrorType, true)).toBe(false);
  });

  it('isTypeAssetSupported', () => {
    const xudtTestnetType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtTestnetType, false)).toBe(true);

    const xudtMainnetType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetType, true)).toBe(true);

    const xudtMainnetErrorType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetErrorType, true)).toBe(false);
  });

  it('calculateRgbppCellCapacity', () => {
    const firstInput = {
      previousOutput: {
        txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
        index: '0x0',
      },
      since: '0x0',
    };

    const typeId = generateUniqueTypeArgs(firstInput, 0);
    expect(typeId).toBe('0xdc03ec5c4086fcb813707c6dd8bf5b9848d7e335');
  });

  it('calculateRgbppClusterCellCapacity', () => {
    const clusterData = {
      name: 'Name of the cluster',
      description: 'Description of the cluster',
    };
    const capacity = calculateRgbppClusterCellCapacity(clusterData);
    expect(capacity).toBe(BigInt(212_0000_0000));
  });

  it('calculateRgbppSporeCellCapacity', () => {
    const sporeData = {
      contentType: 'text/plain',
      content: hexToBytes(utf8ToHex('First Spore')),
      clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
    };
    const capacity = calculateRgbppSporeCellCapacity(sporeData);
    expect(capacity).toBe(BigInt(319_0000_0000));
  });

  it('deduplicateList', () => {
    const rgbppLockArgsList = [
      '0x01000000c12747f21eb725b02d8ce3fd062547756b30879504093389cd74f9b3cf357f05',
      '0x01000000c12747f21eb725b02d8ce3fd062547756b30879504093389cd74f9b3cf357f05',
    ];
    expect(1).toBe(deduplicateList(rgbppLockArgsList).length);
  });

  it('isScriptEqual', () => {
    expect(true).toBe(isScriptEqual('0x1234', '1234'));
    expect(false).toBe(isScriptEqual('0x1234', '123456'));
    expect(true).toBe(
      isScriptEqual(
        {
          codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
          hashType: 'type',
          args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
        },
        '0x5500000010000000300000003100000050bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95012000000006ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
      ),
    );
    expect(false).toBe(
      isScriptEqual(
        {
          codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
          hashType: 'type',
          args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
        },
        '0x123456',
      ),
    );
  });

  it('calculateCellOccupiedCapacity', () => {
    const cell: IndexerCell = {
      output: {
        capacity: '0x5e9f53e00',
        lock: {
          args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
          codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
          hashType: 'type',
        },
        type: {
          args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      outPoint: {
        index: '0x1',
        txHash: '0x1a6d2b18faed84293b81ada9d00600a3cdb637fa43a5cfa20eb63934757352ea',
      },
      blockNumber: '0x0',
      txIndex: '0x0',
      outputData: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
    };
    expect(BigInt(17000000000)).toBe(calculateCellOccupiedCapacity(cell));
  });

  it('isSporeCapacitySufficient', () => {
    const sporeCell: IndexerCell = {
      output: {
        capacity: '0x639f53e00', // 267.42177280 CKB
        lock: {
          args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
          codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
          hashType: 'type',
        },
        type: {
          args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      outPoint: {
        index: '0x1',
        txHash: '0x1a6d2b18faed84293b81ada9d00600a3cdb637fa43a5cfa20eb63934757352ea',
      },
      blockNumber: '0x0',
      txIndex: '0x0',
      outputData: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
    };
    expect(true).toBe(isSporeCapacitySufficient(sporeCell));

    const sporeCell1 = {
      ...sporeCell,
      output: {
        ...sporeCell.output,
        capacity: '0x5e9f53e00', // 254 CKB
      },
    };
    expect(false).toBe(isSporeCapacitySufficient(sporeCell1));
  });

  it('checkCkbTxInputsCapacitySufficient', { timeout: 20000 }, async () => {
    const collector = new Collector({
      ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
      ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
    });
    const ckbTxWithDeadCell: CKBComponents.RawTransaction = {
      cellDeps: [],
      headerDeps: [],
      inputs: [
        {
          previousOutput: {
            index: '0x1',
            txHash: '0x1a6d2b18faed84293b81ada9d00600a3cdb637fa43a5cfa20eb63934757352ea',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          capacity: '0x5e9f53e00',
          lock: {
            args: '0x01000000850cf65f93ed86e53044e94049ae76115ab25a4897de9247f947d390dcf4a4fc',
            codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
            hashType: 'type',
          },
          type: {
            args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
            codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
            hashType: 'type',
          },
        },
      ],
      outputsData: ['0x00743ba40b0000000000000000000000'],
      version: '0x0',
      witnesses: [],
    };
    try {
      await checkCkbTxInputsCapacitySufficient(ckbTxWithDeadCell, collector);
    } catch (error) {
      if (error instanceof NoLiveCellError) {
        expect(102).toBe(error.code);
        expect('The cell with the specific out point is dead').toBe(error.message);
      }
    }

    const invalidCkbTx: CKBComponents.RawTransaction = {
      cellDeps: [],
      headerDeps: [],
      inputs: [
        {
          previousOutput: {
            index: '0x0',
            txHash: '0xeb6ea53459efc83755e4ede6ff54b7698913379e678c6018e1eac87241f964f2',
          },
          since: '0x0',
        },
        {
          previousOutput: {
            index: '0x0',
            txHash: '0x80314ab559ddc7b2f9e523f968b2d930b1a7b53f690091e6666570b46f54b804',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          capacity: '0x65e9f53e00',
          lock: {
            args: '0x01000000850cf65f93ed86e53044e94049ae76115ab25a4897de9247f947d390dcf4a4fc',
            codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
            hashType: 'type',
          },
          type: {
            args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
            codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
            hashType: 'type',
          },
        },
      ],
      outputsData: ['0x00743ba40b0000000000000000000000'],
      version: '0x0',
      witnesses: [],
    };
    expect(false).toBe(await checkCkbTxInputsCapacitySufficient(invalidCkbTx, collector));

    const ckbTx: CKBComponents.RawTransaction = {
      cellDeps: [],
      headerDeps: [],
      inputs: [
        {
          previousOutput: {
            index: '0x0',
            txHash: '0xeb6ea53459efc83755e4ede6ff54b7698913379e678c6018e1eac87241f964f2',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          capacity: '0x5e9f53e00',
          lock: {
            args: '0x01000000850cf65f93ed86e53044e94049ae76115ab25a4897de9247f947d390dcf4a4fc',
            codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
            hashType: 'type',
          },
          type: {
            args: '0x6b6a9580fc2aceb920c63adea27a667acfc180f67cf875b36f31b42546ac4920',
            codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
            hashType: 'type',
          },
        },
      ],
      outputsData: ['0x00743ba40b0000000000000000000000'],
      version: '0x0',
      witnesses: [],
    };
    expect(true).toBe(await checkCkbTxInputsCapacitySufficient(ckbTx, collector));
  });
});
