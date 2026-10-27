import { z } from "zod";
export function defineVocabulary<const T extends readonly [string, ...string[]]>(values: T, labels: Record<T[number], string>) {
  return { values, schema: z.enum(values), options: values.map(value => ({ value, label: labels[value as T[number]] })) };
}
