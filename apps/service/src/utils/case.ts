import { SnakeCasedPropertiesDeep, CamelCasedPropertiesDeep } from 'type-fest';
import { toSnake, toCamel } from 'convert-keys';

export type SnakeCased<T> = SnakeCasedPropertiesDeep<T>;
export type CamelCased<T> = CamelCasedPropertiesDeep<T>;

export const toSnakeCase = <T>(obj: T): SnakeCased<T> | null => {
  try {
    return toSnake(obj);
  } catch (error) {
    console.error(error);
  }
  return null;
};

export const toCamelCase = <T>(obj: T): CamelCased<T> | null => {
  try {
    return toCamel(obj);
  } catch (error) {
    console.error(error);
  }
  return null;
};
