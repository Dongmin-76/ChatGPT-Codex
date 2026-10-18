import { z } from 'zod/v4';

// Both the provider contract and local validation come from the same definition.
// Pattern is a supported Structured Outputs string constraint; it also handles newlines.
export function structuredSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, {
    reused: 'inline',
    override({ jsonSchema }) {
      if (jsonSchema.type === 'string' && (jsonSchema.minLength !== undefined || jsonSchema.maxLength !== undefined)) {
        jsonSchema.pattern = `^[\\s\\S]{${jsonSchema.minLength ?? 0},${jsonSchema.maxLength ?? ''}}$`;
        delete jsonSchema.minLength;
        delete jsonSchema.maxLength;
      }
    },
  });
  delete json.$schema;
  return json;
}
