import camelcaseKeys from 'camelcase-keys';

export const toCamelcase = (object: unknown) => {
  try {
    return JSON.parse(
      JSON.stringify(
        camelcaseKeys(object!, {
          deep: true,
        }),
      ),
    );
  } catch (error) {
    console.error(error);
  }
  return null;
};
