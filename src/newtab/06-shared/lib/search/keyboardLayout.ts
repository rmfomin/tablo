const ENGLISH_LAYOUT = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./";
const RUSSIAN_LAYOUT = "ёйцукенгшщзхъфывапролджэячсмитьбю.";
const ENGLISH_LAYOUT_SHIFTED = '~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?';
const RUSSIAN_LAYOUT_SHIFTED = "ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,";

const oppositeLayoutCharacters = new Map<string, string>();

addLayoutPair(ENGLISH_LAYOUT, RUSSIAN_LAYOUT);
addLayoutPair(ENGLISH_LAYOUT_SHIFTED, RUSSIAN_LAYOUT_SHIFTED);

export function getKeyboardLayoutSearchVariants(value: string): string[] {
  const original = value.toLocaleLowerCase();
  const oppositeLayout = Array.from(value, (character) =>
    oppositeLayoutCharacters.get(character) ?? character,
  )
    .join("")
    .toLocaleLowerCase();

  return oppositeLayout === original
    ? [original]
    : [original, oppositeLayout];
}

function addLayoutPair(left: string, right: string) {
  Array.from(left).forEach((character, index) => {
    const oppositeCharacter = right[index];
    oppositeLayoutCharacters.set(character, oppositeCharacter);
    oppositeLayoutCharacters.set(oppositeCharacter, character);
  });
}
