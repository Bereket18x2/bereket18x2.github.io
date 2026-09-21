/* ===========================================================
   extract.mjs — locate a region of a file by STRUCTURE.

   WHY THIS EXISTS. tests/validators.test.mjs used to read the questions
   block out of firestore.rules with `slice(i, i + 3000)`. Adding a
   comment to that block pushed `allow delete: if false` past character
   3000, and the assertion that nothing could delete a child's question
   started passing against an empty string. It was green. It was
   asserting nothing.

   It only surfaced because 3000 happened to be short enough that one
   assertion flipped to FAILING first. A slightly longer window would
   have gone on lying indefinitely, and the thing it was lying about was
   whether a teacher can erase a child's words.

   So: no character offsets, no line numbers, no "the next 900
   characters". A region is named by the markers that bound it.

   AND EVERY FUNCTION HERE THROWS WHEN A MARKER IS MISSING. That is the
   other half of the lesson and the easier half to get wrong. An
   unguarded `indexOf` returns -1, `slice(-1)` returns the last character
   of the file, and `/forbidden/.test(thatOneCharacter)` is false — so a
   renamed function or a moved id turns a real assertion into a green
   one. A test that cannot find what it is testing has failed; it has not
   passed.
   =========================================================== */

class MarkerMissing extends Error {
  constructor(what, marker) {
    super(`cannot locate ${what}: marker ${JSON.stringify(marker)} is not in the file.\n` +
          `       This is a FAILURE, not an absence — the assertions that follow\n` +
          `       would have run against nothing. Update the marker or the file.`);
    this.name = 'MarkerMissing';
  }
}

const find = (text, marker, what, from = 0) => {
  const i = text.indexOf(marker, from);
  if (i === -1) throw new MarkerMissing(what, marker);
  return i;
};

/* From `start` up to and including `end`. Both are literal markers, and
   `end` is searched for AFTER `start` so a marker that also appears
   earlier in the file cannot invert the region. */
export function between(text, start, end, what = 'a region') {
  const a = find(text, start, what);
  const b = find(text, end, what, a + start.length);
  return text.slice(a, b + end.length);
}

/* From `start` to the end of the file. Use when the thing being checked
   is "nothing below here mentions X" — over-inclusive is the safe
   direction for a negative assertion, because extra content can only
   make it fail, never pass wrongly. */
export function after(text, start, what = 'a region') {
  return text.slice(find(text, start, what));
}

/* From `start` through the brace that closes the block it opens.

   Counts braces from the first `{` at or after the marker, so the region
   ends exactly where the block does however long it grows. This is the
   one to use for a firestore.rules `match`, a CSS rule, or a function
   body — the bound is the language's own, not a number somebody picked.

   Throws if the braces never balance, rather than silently returning the
   rest of the file. */
export function braced(text, start, what = 'a block') {
  const a = find(text, start, what);
  /* The opener is the LAST brace on the marker's own line, not the
     first. `match /questions/{questionId} {` carries a path parameter
     before the block opens, and counting from `{questionId}` closes the
     region 29 characters later — which is exactly the kind of silently
     tiny region this module exists to prevent. */
  const eol = text.indexOf('\n', a);
  const line = text.slice(a, eol === -1 ? text.length : eol);
  const open = line.lastIndexOf('{') === -1
    ? text.indexOf('{', a)
    : a + line.lastIndexOf('{');
  if (open === -1) throw new MarkerMissing(what, start + ' … {');
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(a, i + 1);
  }
  throw new Error(`cannot locate ${what}: the block opened at ${JSON.stringify(start)} never closes.`);
}
