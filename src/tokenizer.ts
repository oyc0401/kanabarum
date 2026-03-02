import kuromoji from "kuromoji";

export type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

async function buildTokenizer(): Promise<Tokenizer> {
  const isNode =
    typeof process !== "undefined" && typeof process.versions?.node === "string";

  let dicPath: string;
  if (isNode) {
    const { default: path } = await import("node:path");
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    dicPath = path.join(req.resolve("kuromoji"), "..", "..", "dict");
  } else {
    dicPath = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/";
  }

  return new Promise((resolve, reject) => {

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
