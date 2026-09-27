import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Whether an optional file (avatar, CV PDF) has been added to /public. Pages are prerendered from the project root. */
export function publicFileExists(urlPath: string | undefined): urlPath is string {
  return Boolean(urlPath) && existsSync(join(process.cwd(), 'public', urlPath!));
}
