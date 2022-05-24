import Decimal from 'decimal.js';
import { Transaction, TransactionType } from './typed';
import { random, shuffle, times } from 'lodash';

export const genOption = <A>(f: () => A): A | undefined =>
  Math.random() > 0.5 ? f() : undefined;

export const genDepositAmount = (maxDepositAmount = 50_000.0): Decimal =>
  new Decimal(random(5.0, maxDepositAmount));

export const genFiatCurrency = (): string =>
  shuffle(['USD', 'EUR', 'JPY', 'AUD', 'CAD'])[0];

export const genTransactionType = (): TransactionType =>
  shuffle(Object.values(TransactionType))[0] as TransactionType;

export const genExchange = (): string =>
  shuffle([
    // CEX
    'Binance',
    'FTX',
    'Kraken',
    'KuCoin',
    'Crypto.com',
    'BTC Markets',
    'Coinbase',
    'Bitfinex',
    'Gate.io',
    'Coinspot',

    // DEX
    'Uniswap',
    'PancakeSwap',
    'dYdX',
    'Curve Finance',
    'SushiSwap',
    'TraderJoe',
    'Orca',
    'Astroport',
    'THORChain',
    'PRISM Swap',
  ])[0];

export const genSampleTransactions = (
  transactionsToGenerate?: number
): Transaction[] => {
  const transactions: Transaction[] = [];

  // Always start off with an initial on-ramp deposit amount.
  transactions.push({
    dt: new Date(),
    exchange: genOption(genExchange),
    receiveQty: genDepositAmount(),
    receiveToken: genFiatCurrency(),
    fee1xFiat: new Decimal(0),
  });

  // Begin generating N transactions (-1 to account for initial deposit on-ramp).
  const numberOfTransactions = transactionsToGenerate ?? random(50, 1000) - 1;

  return times(numberOfTransactions).reduce((acc) => {
    return acc;
  }, transactions);
};
