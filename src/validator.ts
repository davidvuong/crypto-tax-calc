import Decimal from 'decimal.js';
import BaseJoi, {
  AnySchema,
  CoerceResult,
  CustomHelpers,
  Extension,
  ExtensionRule,
  Schema,
  SchemaInternals,
} from 'joi';

const name = 'bigdecimal';

enum DecimalSchemaErrorCode {
  NUMBER = 'bigdecimal.number',
  NOT_DECIMAL = 'bigdecimal.notdecimal',
  POSITIVE = 'bigdecimal.positive',
}

enum DecimalSchemaFlag {
  POSITIVE = 'POSITIVE',
}

interface DecimalAttributes {
  positive(): this;
}

interface DecimalSchema extends AnySchema, DecimalAttributes {}

// TODO: extract this to its own package
export const Joi: BaseJoi.Root & { [name](): DecimalSchema } = BaseJoi.extend(
  (joi): Extension => {
    const messages: Record<DecimalSchemaErrorCode, string> = {
      [DecimalSchemaErrorCode.NUMBER]: '{{#label}} must be a big number',
      [DecimalSchemaErrorCode.NOT_DECIMAL]:
        'key {{#label}} {{#value}} is not a decimal. Is convert enabled?',
      [DecimalSchemaErrorCode.POSITIVE]: `key {{#label}} {{#value}} is not positive`,
    };

    const rules: Record<
      keyof DecimalAttributes,
      ExtensionRule & ThisType<SchemaInternals>
    > = {
      positive: {
        method() {
          console.log('Positive hue');
          return this.$_setFlag(DecimalSchemaFlag.POSITIVE, true);
        },
      },
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
      rules,
      validate(value: any, helpers: CustomHelpers) {
        if (!(value instanceof Decimal)) {
          return { errors: helpers.error(DecimalSchemaErrorCode.NOT_DECIMAL) };
        }

        if (
          helpers.schema.$_getFlag(DecimalSchemaFlag.POSITIVE) &&
          !value.isPositive()
        ) {
          return { errors: helpers.error(DecimalSchemaErrorCode.POSITIVE) };
        }

        return { value };
      },
    };
  }
);

export default Joi;

export const validateSchema = <T>(data: unknown, schema: Schema): T => {
  const { value, error } = schema.validate(data);
  if (error) {
    throw error;
  }
  return value as T;
};
