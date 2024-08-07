import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function saveJson(props: { filename: string; json: object; path?: string }) {
  const directory = props.path ?? resolve(__dirname, '../generated');
  const fileFullName = `${props.filename}-${Date.now()}.json`;
  const fileFullPath = join(directory, fileFullName);

  if (!props.path && !existsSync(directory)) {
    mkdirSync(directory);
  }

  writeFileSync(
    fileFullPath,
    JSON.stringify(
      props.json,
      (_, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
      },
      2,
    ),
  );
  console.log(`[save json] ${fileFullName} has been saved to ${directory}`);
}
