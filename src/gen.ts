import Decimal from 'decimal.js';
import {
  RampTransaction,
  Transaction,
  TrxType,
  RampTrxType,
  TransferTransaction,
  TradeTransaction,
  TransactionCsvRow,
  csvToTransactions,
} from './typed';
import { last, sample, random, shuffle, take, size, clone } from 'lodash';
import { add } from 'date-fns';
import { stringify } from 'csv/sync';

export const genOption = <A>(f: () => A): A | undefined =>
  Math.random() > 0.5 ? f() : undefined;

export const genRampAmount = (
  maxDepositAmount = new Decimal(50_000.0)
): Decimal => new Decimal(random(5.0, maxDepositAmount.toNumber(), true));

// Fiat currency and their USD->X exchange rate.
export const genFiatCurrency = (): [string, Decimal] =>
  sample([
    ['USD', new Decimal(1)],
    ['EUR', new Decimal(random(0.93, 0.933))],
    ['JPY', new Decimal(random(110.58, 130.71))],
    ['AUD', new Decimal(random(1.36, 1.42))],
    ['CAD', new Decimal(random(1.2, 1.39))],
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

export const genTransferPercentage = (): number => sample([0.5, 0.75, 1])!;

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

export const genToken = (
  excludeToken?: string,
  capcityOptions?: {
    tokens: string[];
    maxOperatingTokens: number;
  }
): string => {
  if (
    capcityOptions &&
    capcityOptions.tokens.length >= capcityOptions.maxOperatingTokens
  ) {
    return sample(capcityOptions.tokens)!;
  }
  const token = take(
    shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    random(3, 5)
  ).join('');
  if (token !== excludeToken) {
    return token;
  }
  return genToken(excludeToken, capcityOptions);
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
  maxTransactionsToGenerate?: number,
  maxOperatingTokens = 10
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
    receiveQty: genRampAmount(),
    receiveToken: tracking.fiatCurrency,
  });

  // Begin generating N transactions (-1 to account for initial deposit on-ramp).
  while (true) {
    const dt = genNextDt(last(transactions)!.dt);
    const nextTrxType = genTrxType();

    switch (nextTrxType) {
      case TrxType.DEPOSIT: {
        appendRampTransaction(TrxType.DEPOSIT, transactions, {
          dt,
          receiveQty: genRampAmount(),
          receiveToken: tracking.fiatCurrency,
        });
        break;
      }
      case TrxType.WITHDRAW: {
        if (tracking.fiat.isZero()) {
          continue;
        }
        appendRampTransaction(nextTrxType, transactions, {
          dt,
          receiveQty: genRampAmount(tracking.fiat),
          receiveToken: tracking.fiatCurrency,
        });
        break;
      }
      case TrxType.TRADE: {
        // DEPOSIT then immediately WITHDRAW. No funds to trade. Need to deposit first.
        if (tracking.fiat.isZero() && size(tracking.tokens) === 0) {
          appendRampTransaction(TrxType.DEPOSIT, transactions, {
            dt,
            receiveQty: genRampAmount(),
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
            : genToken(sentToken, {
                tokens: Object.keys(tracking.tokens),
                maxOperatingTokens,
              });
        const receive1xFiat =
          sentToken === tracking.fiatCurrency
            ? new Decimal(1).mul(tracking.fiatExchangeRate)
            : tracking.tokens[receiveToken]?.lastPrice ??
              genTokenPrice().mul(tracking.fiatExchangeRate);
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
        const transaction: TradeTransaction = {
          dt,
          type: TrxType.TRADE,
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
        };
        transactions.push(transaction);
        break;
      }
      case TrxType.TRANSFER: {
        if (size(tracking.tokens) === 0) {
          continue;
        }

        const transferTokenSymbol = sample(Object.keys(tracking.tokens))!;
        const transferToken = tracking.tokens[transferTokenSymbol];
        const transferPercentage = genTransferPercentage();
        const transferAmount = transferToken.qty.mul(transferPercentage);

        const fees = transferAmount.mul(genFeePercentage());
        const transferReceiveAmount = transferAmount.sub(fees);

        transferToken.lastPrice = transferToken.lastPrice.mul(
          genNextTokenPricePercentageDelta()
        );
        transferToken.qty = transferToken.qty.sub(fees);

        const transaction: TransferTransaction = {
          dt,
          type: TrxType.TRANSFER,
          fromExchange: genOption(genExchange),
          toExchange: genOption(genExchange),
          fromQty: transferAmount,
          toQty: transferReceiveAmount,
          token: transferTokenSymbol,
          token1xFiat: transferToken.lastPrice,
          fees,
          fee1xFiat: transferToken.lastPrice,
        };
        transactions.push(transaction);
        break;
      }
    }

    tracking.transactionsGenerated += 1;
    if (tracking.transactionsGenerated === tracking.totalTransactionsRequired) {
      break;
    }
  }

  return transactions;
};

export const genCsv = (trxs?: Transaction[]): string => {
  const transactions = trxs ?? genSampleTransactions(undefined, 10);

  const columns: (keyof TransactionCsvRow)[] = [
    'dt',
    'type',
    'exchange',
    'exchange_dest',
    'receive_qty',
    'receive_token',
    'sent_qty',
    'sent_token',
    'fees',
    'fees_currency',
    'receive_1x_fiat',
    'sent_1x_fiat',
    'fee_1x_fiat',
  ];

  const list: TransactionCsvRow[] = transactions.map((t) => {
    switch (t.type) {
      case TrxType.DEPOSIT: {
        const row: TransactionCsvRow = {
          dt: t.dt,
          type: t.type,
          exchange: t.exchange,
          receive_qty: t.receiveQty.toString(),
          receive_token: t.receiveToken,
          fee_1x_fiat: t.fee1xFiat?.toString(),
        };
        return row;
      }
      case TrxType.WITHDRAW: {
        const row: TransactionCsvRow = {
          dt: t.dt,
          type: t.type,
          exchange: t.exchange,
          receive_qty: t.receiveQty.toString(),
          receive_token: t.receiveToken,
          fee_1x_fiat: t.fee1xFiat?.toString(),
        };
        return row;
      }
      case TrxType.TRANSFER: {
        const row: TransactionCsvRow = {
          dt: t.dt,
          type: t.type,
          exchange: t.fromExchange,
          exchange_dest: t.toExchange,
          receive_qty: t.toQty.toString(),
          receive_token: t.token,
          sent_qty: t.fromQty.toString(),
          sent_token: t.token,
          fees: t.fees.toString(),
          fees_currency: t.token,
          receive_1x_fiat: t.token1xFiat.toString(),
          sent_1x_fiat: t.token1xFiat.toString(),
          fee_1x_fiat: t.fee1xFiat.toString(),
        };
        return row;
      }
      case TrxType.TRADE: {
        const row: TransactionCsvRow = {
          dt: t.dt,
          type: t.type,
          exchange: t.exchange,
          exchange_dest: undefined,
          receive_qty: t.receiveQty.toString(),
          receive_token: t.receiveToken,
          sent_qty: t.sentQty.toString(),
          sent_token: t.sentToken,
          fees: t.fees.toString(),
          fees_currency: t.feeCurrency,
          receive_1x_fiat: t.receive1xFiat.toString(),
          sent_1x_fiat: t.sent1xFiat.toString(),
          fee_1x_fiat: t.fee1xFiat.toString(),
        };
        return row;
      }
    }
  });

  const csvString = stringify(list, { columns, header: true });
  return csvString;
};

const csv = genCsv();
console.log(csv);

const transactions = csvToTransactions(csv);
console.log(transactions);
