import Decimal from 'decimal.js';
import BaseJoi, {
  AnySchema,
  CoerceResult,
  CustomHelpers,
  Extension,
  Schema,
} from 'joi';

const name = 'bigdecimal';

enum DecimalSchemaErrorCode {
  NUMBER = 'bigdecimal.number',
  NOT_DECIMAL = 'bigdecimal.notdecimal',
}

enum DecimalSchemaFlag {}

interface DecimalSchema extends AnySchema {}

// TODO: extract this to its own package
export const Joi: BaseJoi.Root & { [name](): DecimalSchema } = BaseJoi.extend(
  (joi): Extension => {
    const messages: Record<DecimalSchemaErrorCode, string> = {
      [DecimalSchemaErrorCode.NUMBER]: '{{#label}} must be a big number',
      [DecimalSchemaErrorCode.NOT_DECIMAL]:
        'key {{#label}} {{#value}} is not a decimal. Is convert enabled?',
    };

    return {
      type: name,
      base: joi.any(),
      messages,
      coerce(value, helpers): CoerceResult {
        // TODO: Error mapping following joi conventions
        // TODO: add extra validation rules
        const result = value instanceof Decimal ? value : new Decimal(value);
        if (result.isNaN()) {
          return helpers.error(DecimalSchemaErrorCode.NUMBER);
        }

        return {
          value: new Decimal(value),
        };
      },
      validate(value: any, helpers: CustomHelpers) {
        if (!(value instanceof Decimal)) {
          return { errors: helpers.error(DecimalSchemaErrorCode.NOT_DECIMAL) };
        }
        return { value };
      },
    };
  }
);

export default Joi;

export const validateSchema = <T>(data: unknown, schema: Schema): T => {
  const { value, error } = schema.validate(data, { convert: false });
  if (error) {
    throw error;
  }
  return value as T;
};
