import './App.css';
import { sendBtc, NetworkType, DataSource } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';

function App() {
  async function send() {
    const networkType = NetworkType.TESTNET;

    const service = BtcAssetsApi.fromToken(
      import.meta.env.VITE_BTC_SERVICE_URL!,
      import.meta.env.VITE_BTC_SERVICE_TOKEN!,
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
      source,
    });

    console.log('passed', psbt.toHex());
  }

  return (
    <div>
      <h1>Hello</h1>
      <button onClick={send}>Send BTC</button>
    </div>
  );
}

export default App;
