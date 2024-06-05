import { toSnake } from 'convert-keys';

export const toSnakeCase = <T>(obj: object): T | null => {
  try {
    return toSnake(obj);
  } catch (error) {
    console.error(error);
  }
  return null;
};
