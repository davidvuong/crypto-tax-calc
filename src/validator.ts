import Decimal from 'decimal.js';
import BaseJoi, { AnySchema, CoerceResult, Extension, Schema } from 'joi';
import { join } from 'lodash';

enum DecimalSchemaErrorCode {
  NUMBER = 'bigdecimal.number',
}

enum DecimalSchemaFlag {}

interface DecimalSchema extends AnySchema {}

export const Joi: BaseJoi.Root & { bigdecimal(): DecimalSchema } =
  BaseJoi.extend((joi): Extension => {
    return {
      type: 'bigdecimal',
      base: joi.any(),
      messages: {
        [DecimalSchemaErrorCode.NUMBER]: '{{#label}} must be a big number',
      },
      coerce(value, helpers): CoerceResult {
        // TODO: Error mapping following joi conventions
        // TODO: add extra validation rules
        const result = new Decimal(value);

        if (result.isNaN()) {
          return helpers.error(DecimalSchemaErrorCode.NUMBER);
        }

        return {
          value: new Decimal(value),
        };
      },
    };
  });

export default Joi;

export const validateSchema = <T>(data: unknown, schema: Schema): T => {
  const { value, error } = schema.validate(data);
  if (error) {
    throw error;
  }
  return value as T;
};
