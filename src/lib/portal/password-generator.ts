import 'server-only';
import { randomInt } from 'node:crypto';

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*-_+=?';
const ALL = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

export const TEMPORARY_PASSWORD_LENGTH = 16;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

/** Generates a temporary password with at least one character of every class (CSPRNG). */
export function generateTemporaryPassword(length: number = TEMPORARY_PASSWORD_LENGTH): string {
  const chars = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) {
    chars.push(pick(ALL));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
