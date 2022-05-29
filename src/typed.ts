import Decimal from 'decimal.js';

export enum TrxType {
  TRANSFER = 'TRANSFER',
  TRADE = 'TRADE',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export type RampTrxType = TrxType.DEPOSIT | TrxType.WITHDRAW;

export interface TradeTransaction {
  dt: Date;
  type: TrxType.TRADE;
  exchange?: string;

  receiveQty: Decimal;
  receiveToken: string;
  receive1xFiat: Decimal;

  sentQty: Decimal;
  sentToken: string;
  sent1xFiat: Decimal;

  fees: Decimal;
  feeCurrency: string;
  fee1xFiat: Decimal;
}

export interface TransferTransaction {
  dt: Date;
  type: TrxType.TRANSFER;

  fromExchange?: string;
  fromQty: Decimal;
  toExchange?: string;
  toQty: Decimal;

  token: string;
  token1xFiat: Decimal;

  fees: Decimal;
  fee1xFiat: Decimal;
}

export interface RampTransaction {
  dt: Date;
  type: TrxType.DEPOSIT | TrxType.WITHDRAW;
  exchange?: string;

  receiveQty: Decimal;
  receiveToken: string;

  fee1xFiat?: Decimal;
}

export type Transaction =
  | TradeTransaction
  | TransferTransaction
  | RampTransaction;

export interface TransactionCsv {
  dt: Date;
  type: TrxType;
  exchange?: string;
  exchange_dest?: string;
  receive_qty?: string;
  receive_token?: string;
  sent_qty?: string;
  sent_token?: string;
  fees?: string;
  fees_currency?: string;
  receive_1x_fiat?: string;
  sent_1x_fiat?: string;
  fee_1x_fiat?: string;
}
