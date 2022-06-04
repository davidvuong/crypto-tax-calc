import { isNil, pickBy } from 'lodash';
import { parse } from 'csv/sync';
import {
  RampTransactionSchema,
  TradeTransactionSchema,
  Transaction,
  TransactionCsvRow,
  TransferTransactionSchema,
  TrxType,
} from './typed';
import { validateSchema } from './validator';

export const csvToTransactions = (csvString: string): Transaction[] => {
  const rawCsv: TransactionCsvRow[] = parse(csvString, {
    columns: true,
    skipEmptyLines: true,
  });

  const parsedCsv = rawCsv.map((row) =>
    pickBy(row, (v) => v !== '' && !isNil(v))
  );

  return parsedCsv.map((row) => {
    switch (row.type) {
      case TrxType.DEPOSIT:
      case TrxType.WITHDRAW: {
        const data = {
          dt: row.dt,
          type: row.type,
          exchange: row.exchange,
          receiveQty: row.receive_qty,
          receiveToken: row.receive_token,
        };
        return validateSchema(data, RampTransactionSchema);
      }
      case TrxType.TRANSFER: {
        const data = {
          dt: row.dt,
          type: row.type,
          fromExchange: row.exchange,
          toExchange: row.exchange_dest,
          toQty: row.receive_qty,
          fromQty: row.sent_qty,
          token: row.receive_token || row.sent_token,
          token1xFiat: row.receive_1x_fiat || row.sent_1x_fiat,
          fees: row.fees,
          fee1xFiat: row.fee_1x_fiat,
        };
        return validateSchema(data, TransferTransactionSchema);
      }
      case TrxType.TRADE: {
        const data = {
          dt: row.dt,
          type: row.type,
          exchange: row.exchange,
          receiveQty: row.receive_qty,
          receiveToken: row.receive_token,
          sentQty: row.sent_qty,
          sentToken: row.sent_token,
          fees: row.fees,
          feeCurrency: row.fees_currency,
          receive1xFiat: row.receive_1x_fiat,
          sent1xFiat: row.sent_1x_fiat,
          fee1xFiat: row.fee_1x_fiat,
        };
        return validateSchema(data, TradeTransactionSchema);
      }
      default:
        throw new Error('Uknown row type' + row.type);
    }
  });
};
