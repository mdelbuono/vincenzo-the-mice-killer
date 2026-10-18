// Copies the freshly built docs/ into .play/ so `npm run play` serves a frozen
// copy of the game: later builds into docs/ don't change what the kids are playing.
import { cpSync, rmSync } from 'node:fs';

const SOURCE = 'docs';
const SNAPSHOT = '.play';

rmSync(SNAPSHOT, { recursive: true, force: true });
cpSync(SOURCE, SNAPSHOT, { recursive: true });
console.log(`Snapshot of ${SOURCE}/ saved in ${SNAPSHOT}/`);
