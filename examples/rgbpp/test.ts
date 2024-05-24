import { btcService } from './env';

const run = async () => {
  const response = await btcService.getRgbppSpvProof(
    'a532f9f9f37f44be66d08faf3a27f0cc4dd5dd169780f9e54f902a1579bac2b1',
    0,
  );
  console.log(JSON.stringify(response));
};

run();
