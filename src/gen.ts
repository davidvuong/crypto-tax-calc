import Decimal from 'decimal.js';
import { RampTransaction, Transaction, TrxType } from './typed';
import { last, random, shuffle } from 'lodash';
import { add } from 'date-fns';

export const genOption = <A>(f: () => A): A | undefined =>
  Math.random() > 0.5 ? f() : undefined;

export const genDepositAmount = (maxDepositAmount = 50_000.0): Decimal =>
  new Decimal(random(5.0, maxDepositAmount));

// Fiat currency and their USD->X exchange rate.
export const genFiatCurrency = (): [string, number] =>
  shuffle([
    ['USD', 1],
    ['EUR', random(0.93, 0.933)],
    ['JPY', random(110.58, 130.71)],
    ['AUD', random(1.36, 1.42)],
    ['CAD', random(1.2, 1.39)],
  ] as [string, number][])[0];

export const genNextDt = (dt: Date): Date =>
  add(dt, {
    hours: random(1, 24),
    minutes: random(1, 60),
    seconds: random(1, 60),
  });

// TODO: TrxTypes should have a weighting. TRADE operations are far more likely to occur than WITHDRAW or DEPOSIT.
export const genTrxType = (): TrxType =>
  shuffle(Object.values(TrxType))[0] as TrxType;

export const genSwapPercentage = (): number =>
  shuffle([0.1, 0.2, 0.25, 0.5, 0.75, 1])[0];

export const genCex = (): string =>
  shuffle([
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
  ])[0];

export const genDex = (): string =>
  shuffle([
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

export const genExchange = (): string =>
  Math.random() > 0.5 ? genCex() : genDex();

export const genSampleTransactions = (
  startingDate?: Date,
  maxTransactionsToGenerate?: number
): Transaction[] => {
  // Helpers //
  const genRampTransaction = (
    type: TrxType.DEPOSIT | TrxType.WITHDRAW,
    options: Pick<RampTransaction, 'dt' | 'receiveQty' | 'receiveToken'>
  ): RampTransaction => ({ type, exchange: genExchange(), ...options });

  const trackRunningFiat = (amount: Decimal, type: TrxType) => {
    tracking.fiat =
      type === TrxType.WITHDRAW
        ? tracking.fiat.sub(amount)
        : tracking.fiat.add(amount);
  };

  const [fiatCurrency, fiatExchangeRate] = genFiatCurrency();
  const tracking = {
    fiat: genDepositAmount(),
    fiatCurrency,
    fiatExchangeRate,
    transactionsGenerated: 0,
    totalTransactionsRequired:
      maxTransactionsToGenerate ?? random(50, 1000) - 1,
    tokens: {} as Record<string, Decimal>,
  };

  // Always start off with an initial on-ramp deposit amount.
  const transactions: Transaction[] = [
    genRampTransaction(TrxType.DEPOSIT, {
      dt: startingDate ?? new Date(),
      receiveQty: tracking.fiat,
      receiveToken: tracking.fiatCurrency,
    }),
  ];

  // Begin generating N transactions (-1 to account for initial deposit on-ramp).
  while (true) {
    const previousDt = last(transactions)!.dt; // We've guaranteed at least 1 transaction above.
    const nextTrxType = genTrxType();

    switch (nextTrxType) {
      case TrxType.DEPOSIT:
      case TrxType.WITHDRAW:
        if (nextTrxType === TrxType.WITHDRAW && tracking.fiat.isZero()) {
          continue;
        }
        const receiveQty = genDepositAmount();
        trackRunningFiat(receiveQty, nextTrxType);

        transactions.push(
          genRampTransaction(nextTrxType, {
            dt: genNextDt(previousDt),
            receiveQty,
            receiveToken: tracking.fiatCurrency,
          })
        );
        break;
      case TrxType.TRADE:
        const bag = [...Object.keys(tracking.tokens), tracking.fiatCurrency];
        const swapPct = genSwapPercentage();

        // TODO:
        //
        // Decide if we should use our fiat to buy crypto or swap an existing token for a new token
        // Decide the proportion of existing fiat/token to use for new token (or existing token)
        // Generate the price of the token we're buying and selling (fiat will be 1 * exchange_rate for fiat currency)
        // Generate a fee percentage. fee = pct * value_of_all_tokens_sold
        // Decide currency used to paid for fee
        break;
      case TrxType.TRANSFER:
        // TODO:
        //
        // Examine all existing tokens held
        // Randomly choose a token to be transferred
        // Generate price for tokens to be transferred
        // Generate fee percentage (same as trade)
        break;
    }

    tracking.transactionsGenerated += 1;
    if (tracking.transactionsGenerated === tracking.totalTransactionsRequired) {
      break;
    }
  }

  return transactions;
};

console.log(genSampleTransactions(new Date('2021-01-01'), 100));
