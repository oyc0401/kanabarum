import kuromoji from "kuromoji";

export type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

async function buildTokenizer(): Promise<Tokenizer> {
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" })
      .build((err, tk) => {
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
