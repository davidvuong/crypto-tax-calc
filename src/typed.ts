import Decimal from 'decimal.js';

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  TRADE = 'TRADE',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export interface TradeTransaction {
  dt: Date;
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

  fromExchange?: string;
  fromQty: Decimal;
  fromToken: string;
  from1xFiat: Decimal;

  toExchange?: string;
  toQty: Decimal;
  toToken: string;
  to1xFiat: Decimal;

  fee1xFiat: Decimal;
}

export interface DepositTransaction {
  dt: Date;
  exchange?: string;

  receiveQty: Decimal;
  receiveToken: string;

  fee1xFiat?: Decimal;
}

export interface WithdrawTransaction {
  dt: Date;
  exchange?: string;

  receiveQty: Decimal;
  receiveToken: string;

  fee1xFiat?: Decimal;
}

export type Transaction =
  | TradeTransaction
  | TransferTransaction
  | DepositTransaction
  | WithdrawTransaction;
