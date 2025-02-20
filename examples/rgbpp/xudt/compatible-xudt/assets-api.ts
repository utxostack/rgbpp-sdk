import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { btcService } from '../../env';

(async () => {
  // const assets = await btcService.getRgbppAssetsByBtcAddress('tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt', {
  //   type_script: serializeScript({
  //     codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
  //     hashType: 'type',
  //     args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  //   }),
  // });
  // console.log('RUSD Assets: ', JSON.stringify(assets));

  // const activities = await btcService.getRgbppActivityByBtcAddress('tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt', {
  //   type_script: serializeScript({
  //     codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
  //     hashType: 'type',
  //     args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  //   }),
  // });
  // console.log('RUSD Activities: ', JSON.stringify(activities));

  //  const balance = await btcService.getRgbppBalanceByBtcAddress('tb1qvt7p9g6mw70sealdewtfp0sekquxuru6j3gwmt', {
  //    type_script: serializeScript({
  //      codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
  //      hashType: 'type',
  //      args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b',
  //    }),
  //    no_cache: true,
  //  });
  //  console.log('RUSD balance from btc-assets-api: ', JSON.stringify(balance));

  // const info = await btcService.getRgbppAssetInfoByTypeScript(
  //   serializeScript({
  //     codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
  //     hashType: 'type',
  //     args: '0x661cfbe2124b3e79e50e505c406be5b2dcf9da15d8654b749ec536fa4c2eaaae',
  //   }),
  // );
  // console.log('Standard xUDT info: ', JSON.stringify(info));

  const rusdInfo = await btcService.getRgbppAssetInfoByTypeScript(
    serializeScript({
      codeHash: '0xcc9dc33ef234e14bc788c43a4848556a5fb16401a04662fc55db9bb201987037',
      hashType: 'type',
      args: '0x71fd1985b2971a9903e4d8ed0d59e6710166985217ca0681437883837b86162f',
    }),
  );
  console.log('RUSD xUDT info: ', JSON.stringify(rusdInfo));

  // const utxoAirdropInfo = await btcService.getRgbppAssetInfoByTypeScript(
  //   serializeScript({
  //     codeHash: '0xf5da9003e31fa9301a3915fe304de9bdb80524b5f0d8fc325fb699317998ee7a',
  //     hashType: 'type',
  //     args: '0xa63d308c04b4c075eb1d7d5cac891cf20276e3ddb2ec855fc981c88d8134dbe2',
  //   }),
  // );
  // console.log('UTXO Airdrop xUDT info: ', JSON.stringify(utxoAirdropInfo));
})();
