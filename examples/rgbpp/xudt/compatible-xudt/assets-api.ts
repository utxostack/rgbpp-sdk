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

  const info = await btcService.getRgbppAssetInfoByTypeScript(
    serializeScript({
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x661cfbe2124b3e79e50e505c406be5b2dcf9da15d8654b749ec536fa4c2eaaae',
    }),
  );
  console.log('Standard xUDT info: ', JSON.stringify(info));
})();
