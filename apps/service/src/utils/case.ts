import type { SnakeCasedPropertiesDeep, CamelCasedPropertiesDeep } from 'type-fest';
import snakeCaseKeys from 'snakecase-keys';
import camelCaseKeys from 'camelcase-keys';

export type SnakeCased<T> = SnakeCasedPropertiesDeep<T>;
export type CamelCased<T> = CamelCasedPropertiesDeep<T>;

// This regex is used to exclude hex strings from being converted to snake_case or camelCase
// Because hex strings in object keys should be kept as is
const excludeHexRegex = /^0x.+/g;

export function toSnakeCase<T extends object>(obj: T, options?: snakeCaseKeys.Options): SnakeCased<T> {
  return snakeCaseKeys(obj as Record<string, unknown>, {
    exclude: [excludeHexRegex],
    deep: true,
    ...options,
  }) as SnakeCased<T>;
}

export function toCamelCase<T>(obj: T, options?: camelCaseKeys.Options): CamelCased<T> {
  return camelCaseKeys(obj as Record<string, unknown>, {
    exclude: [excludeHexRegex],
    deep: true,
    ...options,
  }) as CamelCased<T>;
}
