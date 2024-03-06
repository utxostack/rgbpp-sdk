export const CKB_UNIT = BigInt(10000_0000);
export const MAX_FEE = BigInt(2000_0000);
export const MIN_CAPACITY = BigInt(63) * BigInt(10000_0000);

const TestnetInfo = {
  Secp256k1LockDep: {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0',
    },
    depType: 'depGroup',
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
};

export const getSecp256k1CellDep = (isMainnet = false) =>
  isMainnet ? MainnetInfo.Secp256k1LockDep : TestnetInfo.Secp256k1LockDep;
