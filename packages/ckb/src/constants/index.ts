export const CKB_UNIT = BigInt(10000_0000);
export const MAX_FEE = BigInt(2000_0000);
export const MIN_CAPACITY = BigInt(61) * BigInt(10000_0000);
export const SECP256K1_WITNESS_LOCK_SIZE = 65;
export const BTC_JUMP_CONFIRMATION_BLOCKS = 6;
export const RGBPP_TX_WITNESS_MAX_SIZE = 3000;

export const RGBPP_WITNESS_PLACEHOLDER = '0xFF';
export const RGBPP_TX_ID_PLACEHOLDER = '0000000000000000000000000000000000000000000000000000000000000000';

const TestnetInfo = {
  Secp256k1LockDep: {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  RgbppLockScript: {
    codeHash: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  RgbppLockDep: {
    outPoint: { txHash: '0x40889c7e5900b94252bb621bf287c8ed55ef3dd01fb36ba947a4a4fbf3102fbf', index: '0x0' },
    depType: 'code',
  } as CKBComponents.CellDep,

  RgbppLockConfigDep: {
    outPoint: { txHash: '0x40889c7e5900b94252bb621bf287c8ed55ef3dd01fb36ba947a4a4fbf3102fbf', index: '0x1' },
    depType: 'code',
  } as CKBComponents.CellDep,

  BtcTimeLockScript: {
    codeHash: '0x00cdf8fab0f8ac638758ebf5ea5e4052b1d71e8a77b9f43139718621f6849326',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  BtcTimeLockDep: {
    outPoint: { txHash: '0xb85a83c323fb818a146a195ed794bb48e5aabe26ef30dab95d939feddb29db29', index: '0x0' },
    depType: 'code',
  } as CKBComponents.CellDep,

  BtcTimeLockConfigDep: {
    outPoint: { txHash: '0xb85a83c323fb818a146a195ed794bb48e5aabe26ef30dab95d939feddb29db29', index: '0x1' },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
};

const MainnetInfo = {
  Secp256k1LockDep: {
    outPoint: {
      txHash: '0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  RgbppLockScript: {
    codeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  RgbppLockDep: {
    outPoint: { txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', index: '0x0' },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  RgbppLockConfigDep: {
    outPoint: { txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', index: '0x1' },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  BtcTimeLockScript: {
    codeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  BtcTimeLockDep: {
    outPoint: { txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', index: '0x0' },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  BtcTimeLockConfigDep: {
    outPoint: { txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', index: '0x1' },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
    hashType: 'data1',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xc07844ce21b38e4b071dd0e1ee3b0e27afd8d7532491327f39b786343f558ab7',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
};

export const getSecp256k1CellDep = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.Secp256k1LockDep : TestnetInfo.Secp256k1LockDep;

export const getXudtTypeScript = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.XUDTTypeScript : TestnetInfo.XUDTTypeScript;
export const getXudtDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.XUDTTypeDep : TestnetInfo.XUDTTypeDep);

export const getRgbppLockScript = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.RgbppLockScript : TestnetInfo.RgbppLockScript;
export const getRgbppLockDep = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.RgbppLockDep : TestnetInfo.RgbppLockDep;

export const getRgbppLockConfigDep = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.RgbppLockConfigDep : TestnetInfo.RgbppLockConfigDep;

export const getBtcTimeLockScript = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.BtcTimeLockScript : TestnetInfo.BtcTimeLockScript;
export const getBtcTimeLockDep = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.BtcTimeLockDep : TestnetInfo.BtcTimeLockDep;

export const getBtcTimeLockConfigDep = (isMainnet: boolean) =>
  isMainnet ? MainnetInfo.BtcTimeLockConfigDep : TestnetInfo.BtcTimeLockConfigDep;
