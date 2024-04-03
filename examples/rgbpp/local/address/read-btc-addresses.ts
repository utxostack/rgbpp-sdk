import * as fs from 'fs';
import { parse } from'csv-parse';


export const readBtcAddresses = (): Promise<string[]> => {
  const btcAddresses: string[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream('/home/dylan/ckb/rgbpp/rgbpp-sdk/examples/rgbpp/local/address/btc-addresses.csv')
      .pipe(parse({ delimiter: ',', from_line: 2 }))
      .on('data', function (row: string[]) {
        const btcAddress = row[row.length - 1];
        if (btcAddress) {
          btcAddresses.push(btcAddress.trim());
        }
      })
      .on('end', function () {
        console.log('BTC addresses length: ', btcAddresses.length)
        console.log('Reading BTC addresses has been finished');
        // console.log(btcAddresses)
        resolve(btcAddresses)
      })
      .on('error', function (error) {
        reject(error)
        console.log(error.message);
      });
  });
}

// readBtcAddresses()
