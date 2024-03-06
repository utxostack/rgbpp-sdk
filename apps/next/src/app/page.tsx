'use client';
import { sendBtc, NetworkType, DataSource, BtcAssetsApi } from '@rgbpp-sdk/btc';

export default function Home() {
  async function send() {
    const networkType = NetworkType.TESTNET;

    const service = BtcAssetsApi.fromToken(
      process.env.NEXT_PUBLIC_SERVICE_URL!,
      process.env.NEXT_PUBLIC_SERVICE_TOKEN!,
    );
    const source = new DataSource(service, networkType);

    const psbt = await sendBtc({
      from: 'tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3',
      tos: [
        {
          address: 'tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3',
          value: 1000,
        },
      ],
      networkType,
      source,
    });

    console.log('passed', psbt.toHex());
  }

  return (
    <main>
      <button onClick={send}>Send BTC</button>
    </main>
  );
}
