import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { btcService } from '../../env';

(async () => {
  const assets = await btcService.getRgbppAssetsByBtcAddress('tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt', {
    type_script: serializeScript({
      codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
      hashType: 'type',
      args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
    }),
  });
  console.log('RUSD Assets: ', JSON.stringify(assets));

  const activities = await btcService.getRgbppActivityByBtcAddress('tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt', {
    type_script: serializeScript({
      codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
      hashType: 'type',
      args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
    }),
  });
  console.log('RUSD Activities: ', JSON.stringify(activities));
})();
