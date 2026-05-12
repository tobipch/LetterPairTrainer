// Display label for special letters
export const PAIR_DISPLAY: Record<string, string> = {
  Q: "Q (SCH)",
  X: "X (CH)",
};

export function displayPair(pair: string): string {
  const a = PAIR_DISPLAY[pair[0]] ?? pair[0];
  const b = PAIR_DISPLAY[pair[1]] ?? pair[1];
  return `${a}${b}`;
}

export function displayLetter(letter: string): string {
  return PAIR_DISPLAY[letter] ?? letter;
}

// Letters used in the 21x21 matrix
export const LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
].slice(0, 21); // adjust if needed — the CSV defines the actual set
