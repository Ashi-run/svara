// ---------------------------------------------------------------------------
// STANDS IN FOR THE BACKEND. Replace `mockRecognize()` with a real call to the
// FastAPI ASR + correction endpoint once it exists — everything downstream
// (the review screen, phoneme highlighting, accuracy scoring) already works
// off the shape this function returns, so nothing else needs to change.
// ---------------------------------------------------------------------------

// Common cleft-palate / velopharyngeal-insufficiency compensatory patterns:
// pressure consonants (p,b,t,d,k,g) often reduce toward glottal stops, and
// sibilants/fricatives (s,z,sh,ch,f,v) often weaken toward breathy /h/-like
// frication when oral pressure can't be built up.
const GLOTTAL_MAP = { p: "'", b: "'", t: "'", d: "'", k: "'", g: "'" };
const FRICATION_MAP = { s: "h", z: "h", f: "h", v: "h" };

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} promptText - the target word/sentence shown to the patient
 * @param {number} [variabilitySeed] - vary this (e.g. Date.now()) for a fresh
 *   mock error pattern on retries of the same prompt
 * @returns {{
 *   targetText: string,
 *   recognizedText: string,
 *   chars: Array<{ char: string, status: 'match'|'error'|'other' }>,
 *   accuracyPct: number,
 *   erroredSounds: string[]
 * }}
 */
export function mockRecognize(promptText, variabilitySeed = 0) {
  const rand = mulberry32(hashString(promptText) ^ variabilitySeed);
  const chars = [];
  let recognized = "";
  let consonantCount = 0;
  let errorCount = 0;
  const erroredSounds = new Set();

  for (const rawChar of promptText) {
    const lower = rawChar.toLowerCase();
    const isLetter = /[a-z]/.test(lower);

    if (!isLetter) {
      recognized += rawChar;
      chars.push({ char: rawChar, status: "other" });
      continue;
    }

    const inGlottal = GLOTTAL_MAP[lower];
    const inFrication = FRICATION_MAP[lower];

    if (inGlottal || inFrication) {
      consonantCount++;
      // ~42% chance this particular instance is produced with an error —
      // deterministic per (prompt, seed) so re-renders don't flicker.
      if (rand() < 0.42) {
        errorCount++;
        erroredSounds.add(lower);
        recognized += inGlottal || inFrication;
        chars.push({ char: rawChar, status: "error" });
        continue;
      }
    }

    recognized += rawChar;
    chars.push({ char: rawChar, status: isLetter && (inGlottal || inFrication) ? "match" : "other" });
  }

  const accuracyPct =
    consonantCount === 0 ? 100 : Math.round(((consonantCount - errorCount) / consonantCount) * 100);

  return {
    targetText: promptText,
    recognizedText: recognized,
    chars,
    accuracyPct,
    erroredSounds: Array.from(erroredSounds),
  };
}
