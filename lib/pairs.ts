export const PAIR_DISPLAY: Record<string, string> = {};

export function displayPair(pair: string): string {
  return pair;
}

export function displayLetter(letter: string): string {
  return letter;
}

// Letters used in the 21x21 matrix
export const LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z"
].slice(0, 21); // adjust if needed — the CSV defines the actual set
