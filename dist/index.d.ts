type KanaToHangul = (input: string) => string;
declare function initKanaToHangul(): Promise<KanaToHangul>;
declare function kanaToHangul(input: string): Promise<string>;
declare const KanaBarum: Readonly<{
    init: typeof initKanaToHangul;
}>;

export { type KanaToHangul, KanaBarum as KanaToHangulMaker, kanaToHangul };
