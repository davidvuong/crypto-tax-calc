import Decimal from 'decimal.js';
import Joi, { validateSchema } from './validator';
import { parse } from 'csv/sync';
import { isNil, pickBy } from 'lodash';

export enum TrxType {
  TRANSFER = 'TRANSFER',
  TRADE = 'TRADE',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export const TrxTypeSchema = Joi.string()
  .valid(...Object.values(TrxType))
  .empty('');

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

export const TradeTransactionSchema = Joi.object({
  dt: Joi.date().required(),
  type: Joi.string().valid(TrxType.TRADE).required(),
  exchange: Joi.string(),

  receiveQty: Joi.string().required(),
  receiveToken: Joi.string().required(),
  receive1xFiat: Joi.string().required(),

  sentQty: Joi.string().required(),
  sentToken: Joi.string().required(),
  sent1xFiat: Joi.string().required(),

  fees: Joi.string().required(),
  feeCurrency: Joi.string().required(),
  fee1xFiat: Joi.string().required(),
});

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

export const TransferTransactionSchema = Joi.object({
  dt: Joi.date().required(),
  type: Joi.string().valid(TrxType.TRANSFER).required(),

  fromExchange: Joi.string(),
  fromQty: Joi.bigdecimal().required(),
  toExchange: Joi.string(),
  toQty: Joi.bigdecimal().required(),

  token: Joi.string().required(),
  token1xFiat: Joi.bigdecimal().required(),

  fees: Joi.bigdecimal().required(),
  fee1xFiat: Joi.bigdecimal().required(),
});

export interface RampTransaction {
  dt: Date;
  type: TrxType.DEPOSIT | TrxType.WITHDRAW;
  exchange?: string;

  receiveQty: Decimal;
  receiveToken: string;

  fee1xFiat?: Decimal;
}

export const RampTransactionSchema = Joi.object({
  dt: Joi.date().required(),
  type: Joi.string().valid(TrxType.DEPOSIT, TrxType.WITHDRAW).required(),
  exchange: Joi.string(),

  receiveQty: Joi.string().required(),
  receiveToken: Joi.string().required(),

  fee1xFiat: Joi.string(),
});

export type Transaction =
  | TradeTransaction
  | TransferTransaction
  | RampTransaction;

export interface TransactionCsvRow {
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
