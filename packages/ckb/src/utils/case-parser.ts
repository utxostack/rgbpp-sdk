import camelcaseKeys from 'camelcase-keys';

export const toCamelcase = <T>(obj: object): T | null => {
  try {
    return camelcaseKeys(obj, {
      deep: true,
    }) as T;
  } catch (error) {
    console.error(error);
  }
  return null;
};
