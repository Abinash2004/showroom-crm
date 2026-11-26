import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import type { PasswordHasher, TokenGenerator } from "./ports";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** scrypt password hashing (memory-hard, built into Node, no native deps). Format: scrypt$N$r$p$salt$hash */
export class ScryptHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt, N, R, P);
    return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
    const expected = Buffer.from(hashB64, "base64");
    const actual = await derive(password, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
