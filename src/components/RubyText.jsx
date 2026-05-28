export function RubyText({ kanji, hiragana }) {
  if (!kanji || !hiragana || kanji === hiragana) {
    return <>{kanji || hiragana}</>;
  }

  // Find common suffix (okurigana)
  let suffixLen = 0;
  while (
    suffixLen < kanji.length && 
    suffixLen < hiragana.length && 
    kanji[kanji.length - 1 - suffixLen] === hiragana[hiragana.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const kanjiBase = kanji.slice(0, kanji.length - suffixLen);
  const hiraganaBase = hiragana.slice(0, hiragana.length - suffixLen);
  const suffix = suffixLen > 0 ? kanji.slice(-suffixLen) : "";

  // Find common prefix
  let prefixLen = 0;
  while (
    prefixLen < kanjiBase.length &&
    prefixLen < hiraganaBase.length &&
    kanjiBase[prefixLen] === hiraganaBase[prefixLen]
  ) {
    prefixLen++;
  }

  const prefix = prefixLen > 0 ? kanjiBase.slice(0, prefixLen) : "";
  const finalKanji = kanjiBase.slice(prefixLen);
  const finalHiragana = hiraganaBase.slice(prefixLen);

  return (
    <>
      {prefix}
      {finalKanji ? (
        <ruby>
          {finalKanji}<rt className="text-[var(--primary-color)]">{finalHiragana}</rt>
        </ruby>
      ) : null}
      {suffix}
    </>
  );
}
