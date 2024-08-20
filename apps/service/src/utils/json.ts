import isPlainObject from 'lodash/isPlainObject';

export function ensureSafeJson<Input extends object, Output = Input>(json: Input): Output {
  if (!isPlainObject(json) && !Array.isArray(json)) {
    return json as unknown as Output;
  }

  const obj = Array.isArray(json) ? [] : {};
  for (const key of Object.keys(json)) {
    const value = json[key];
    if (isPlainObject(value) || Array.isArray(value)) {
      obj[key] = ensureSafeJson(value);
    } else {
      // XXX: Convert BigInt to hex string for JSON.stringify() compatibility
      if (typeof value === 'bigint') {
        obj[key] = `0x${value.toString(16)}`;
      } else {
        obj[key] = value;
      }
    }
  }

  return obj as unknown as Output;
}
