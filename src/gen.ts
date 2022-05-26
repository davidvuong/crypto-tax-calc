import Decimal from 'decimal.js';
import { RampTransaction, Transaction, TrxType, RampTrxType } from './typed';
import {
  last,
  sample,
  random,
  shuffle,
  take,
  size,
  times,
  groupBy,
  map,
  clone,
} from 'lodash';
import { add } from 'date-fns';

export const genOption = <A>(f: () => A): A | undefined =>
  Math.random() > 0.5 ? f() : undefined;

export const genDepositAmount = (maxDepositAmount = 50_000.0): Decimal =>
  new Decimal(random(5.0, maxDepositAmount));

// Fiat currency and their USD->X exchange rate.
export const genFiatCurrency = (): [string, Decimal] =>
  sample([
    // ['USD', new Decimal(1)],
    // ['EUR', new Decimal(random(0.93, 0.933))],
    // ['JPY', new Decimal(random(110.58, 130.71))],
    ['AUD', new Decimal(random(1.36, 1.42))],
    // ['CAD', new Decimal(random(1.2, 1.39))],
  ] as [string, Decimal][])!;

export const genNextDt = (dt: Date): Date =>
  add(dt, {
    hours: random(1, 24),
    minutes: random(1, 60),
    seconds: random(1, 60),
  });

export const genTrxType = (): TrxType => {
  const order = Object.values(TrxType) as TrxType[];

  const weights: Record<TrxType, number> = {
    [TrxType.DEPOSIT]: 0.05,
    [TrxType.WITHDRAW]: 0.05,
    [TrxType.TRADE]: 0.7,
    [TrxType.TRANSFER]: 0.2,
  };

  const comparisons: Record<TrxType, number> = clone(weights);
  order.forEach((trxType: TrxType, i) => {
    comparisons[trxType] =
      comparisons[trxType] + (comparisons[order[i - 1]] ?? 0);
  });

  const r = Math.random();
  return order.find((ord) => r <= comparisons[ord])!;
};

// genTestTransferAmount - testing transfers

export const genSwapPercentage = (): number =>
  sample([0.1, 0.2, 0.25, 0.5, 0.75, 1])!;

export const genFeePercentage = (): number => random(0, 0.01);

export const genCex = (): string =>
  sample([
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
  ])!;

export const genDex = (): string =>
  sample([
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
  ])!;

export const genToken = (excludeToken?: string): string => {
  const token = take(
    shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    random(3, 5)
  ).join('');
  if (token !== excludeToken) {
    return token;
  }
  return genToken(excludeToken);
};

export const genStableToken = (): string =>
  sample(['USDC', 'BUSD', 'USDT', 'MIM', 'DAI', 'TUSD', 'sUSD'])!;

export const genTokenPrice = (): Decimal => new Decimal(random(0.01, 1000));

export const genNextTokenPricePercentageDelta = (): Decimal =>
  new Decimal(1 + random(-0.1, 0.1));

export const genExchange = (): string =>
  Math.random() > 0.5 ? genCex() : genDex();

export const genSampleTransactions = (
  startingDate?: Date,
  maxTransactionsToGenerate?: number
): Transaction[] => {
  // Helpers //

  const trackRunningFiat = (amount: Decimal, type: TrxType) => {
    tracking.fiat =
      type === TrxType.WITHDRAW
        ? tracking.fiat.sub(amount)
        : tracking.fiat.add(amount);
  };

  const trackRunningTokens = (
    receiveToken: string,
    receiveQty: Decimal,
    receive1xFiat: Decimal
  ) => {
    const token = tracking.tokens[receiveToken];
    tracking.tokens[receiveToken] = token
      ? {
          qty: token.qty.add(receiveQty),
          lastPrice: receive1xFiat,
        }
      : {
          qty: receiveQty,
          lastPrice: receive1xFiat,
        };
  };

  const appendRampTransaction = (
    type: RampTrxType,
    transactions: Transaction[],
    options: Pick<RampTransaction, 'dt' | 'receiveQty' | 'receiveToken'>
  ): RampTransaction => {
    // TODO: When generating an exchange for WITHDRAW, pick one where we've actually got funds in.
    const transaction = { type, exchange: genCex(), ...options };
    transactions.push(transaction);
    trackRunningFiat(options.receiveQty, type);
    return transaction;
  };

  const [fiatCurrency, fiatExchangeRate] = genFiatCurrency();
  const tracking = {
    fiat: new Decimal(0),
    fiatCurrency,
    fiatExchangeRate,
    transactionsGenerated: 0,
    totalTransactionsRequired:
      maxTransactionsToGenerate ?? random(50, 1000) - 1,
    tokens: {} as Record<string, { qty: Decimal; lastPrice: Decimal }>,
  };

  // Always start off with an initial on-ramp deposit amount.
  const transactions: Transaction[] = [];
  appendRampTransaction(TrxType.DEPOSIT, transactions, {
    dt: startingDate ?? new Date(),
    receiveQty: genDepositAmount(),
    receiveToken: tracking.fiatCurrency,
  });

  console.log('-------------------------------------------DEPOSIT');
  console.log(TrxType.DEPOSIT);
  console.log(tracking);
  console.log(last(transactions));
  console.log('--');
  console.log();

  // Begin generating N transactions (-1 to account for initial deposit on-ramp).
  while (true) {
    const dt = genNextDt(last(transactions)!.dt);
    const nextTrxType = genTrxType();

    console.log('-------------------------------------------START');
    console.log(nextTrxType);
    console.log('BEFORE...');
    console.log(tracking);

    switch (nextTrxType) {
      case TrxType.DEPOSIT:
      case TrxType.WITHDRAW: {
        // Attempting to withdraw when there is no fiat.
        if (nextTrxType === TrxType.WITHDRAW && tracking.fiat.isZero()) {
          continue;
        }
        appendRampTransaction(nextTrxType, transactions, {
          dt,
          receiveQty: Decimal.min(genDepositAmount(), tracking.fiat),
          receiveToken: tracking.fiatCurrency,
        });
        break;
      }
      case TrxType.TRADE: {
        // DEPOSIT then immediately WITHDRAW. No funds to trade. Need to deposit first.
        if (tracking.fiat.isZero() && size(tracking.tokens) === 0) {
          appendRampTransaction(TrxType.DEPOSIT, transactions, {
            dt,
            receiveQty: genDepositAmount(),
            receiveToken: tracking.fiatCurrency,
          });
          break;
        }

        const feePercentage = genFeePercentage();
        const swapPercentage = genSwapPercentage();
        const priceDelta = genNextTokenPricePercentageDelta();

        // Sent Token Attributes
        const sentToken = tracking.fiat.gt(0)
          ? tracking.fiatCurrency
          : sample(Object.keys(tracking.tokens))!;
        const sentQty =
          sentToken === tracking.fiatCurrency
            ? tracking.fiat.mul(swapPercentage)
            : tracking.tokens[sentToken].qty.mul(swapPercentage);
        const sent1xFiat =
          sentToken === tracking.fiatCurrency
            ? new Decimal(1)
            : tracking.tokens[sentToken].lastPrice.mul(priceDelta);

        // Receive Token Attributes
        const receiveToken =
          sentToken === tracking.fiatCurrency
            ? genStableToken()
            : genToken(sentToken);

        // TODO: Check if this new token already exists and if so, grab the previous token price.
        // TODO: Probability of swapping between tokens we already have.
        // Cap the number of tokens we work with to N and then once reached, trades are between existing tokens.
        const receive1xFiat = (
          sentToken === tracking.fiatCurrency ? new Decimal(1) : genTokenPrice()
        ).mul(tracking.fiatExchangeRate);
        let receiveQty = sentQty.mul(sent1xFiat).div(receive1xFiat);

        // Fees
        const fees = receiveQty.mul(feePercentage);
        receiveQty = receiveQty.sub(fees);

        const [feeCurrency, fee1xFiat] = sample([
          [sentToken, sent1xFiat],
          [receiveToken, receive1xFiat],
        ])!;

        // Tracking
        trackRunningTokens(receiveToken, receiveQty, receive1xFiat);

        if (sentToken === tracking.fiatCurrency) {
          trackRunningFiat(sentQty, TrxType.WITHDRAW);
        }

        // TODO: Support NFTs
        transactions.push({
          dt,
          exchange: genOption(genExchange),

          receiveQty,
          receiveToken,
          receive1xFiat,

          sentQty,
          sentToken,
          sent1xFiat,

          fees,
          feeCurrency,
          fee1xFiat,
        });

        break;
      }
      case TrxType.TRANSFER: {
        // TODO:
        //
        // Examine all existing tokens held
        // Randomly choose a token to be transferred
        // Generate price for tokens to be transferred
        // Generate fee percentage (same as trade)
        break;
      }
    }

    console.log('AFTER...');
    console.log(tracking);
    console.log(last(transactions));
    console.log('--');
    console.log();

    tracking.transactionsGenerated += 1;
    if (tracking.transactionsGenerated === tracking.totalTransactionsRequired) {
      break;
    }
  }

  return transactions;
};

genSampleTransactions(new Date('2021-01-01'), 5);

// const trxs = times(1000, genTrxType);
// console.log(map(groupBy(trxs), (value, key) => [key, value.length]));
