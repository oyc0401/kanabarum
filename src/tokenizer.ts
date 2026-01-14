import kuromoji from "kuromoji";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

async function buildTokenizer(): Promise<Tokenizer> {
  return new Promise((resolve, reject) => {
    const dicPath = path.join(require.resolve("kuromoji"), "..", "..", "dict");

    kuromoji.builder({ dicPath }).build((err, tk) => {
      if (err || !tk) reject(err);
      else resolve(tk);
    });
  });
}

let tokenizerPromise: Promise<Tokenizer> | null = null;

export async function getTokenizer(): Promise<Tokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = buildTokenizer();
  }
  return tokenizerPromise;
}
