import fs from 'fs';
import { app } from 'electron';
import path from 'path';


export function getDataDir(): string {
  let dir: string;

  switch (process.platform) {
    case 'win32':
      dir = path.join(app.getPath('appData'), '.orangery');
      break;
    case 'darwin':
      dir = path.join(app.getPath('appData'), 'orangery');
      break;
    default: // linux
      dir = path.join(app.getPath('home'), '.orangery');
  }

  fs.mkdirSync(dir, { recursive: true });
  return dir;
}