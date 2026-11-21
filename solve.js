// Fast drop-in for csv-reader 1.0.0 (make.fun csv-reader-speed-01).
// Semantics mirror the house reader exactly (verified against the kit's
// practice set and its vendor source): single left-to-right pass, fields
// built from slices instead of per-character concatenation.
// No dependencies, no builtins: one ES module exporting run(input).

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = n > 0 && text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  function parseUnquoted() {
    const start = pos;
    let parts = null;
    let seg = pos;
    let added = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        let value;
        if (parts === null) { value = text.slice(start, pos); added = pos - start; }
        else { parts.push(text.slice(seg, pos)); added += pos - seg; value = parts.join(''); }
        pos += 1;
        return { value, ended: COMMA, added };
      }
      if (c === 10) {
        let value;
        if (parts === null) { value = text.slice(start, pos); added = pos - start; }
        else { parts.push(text.slice(seg, pos)); added += pos - seg; value = parts.join(''); }
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      if (c === 13) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
          let value;
          if (parts === null) { value = text.slice(start, pos); added = pos - start; }
          else { parts.push(text.slice(seg, pos)); added += pos - seg; value = parts.join(''); }
          pos += 2;
          line += 1;
          return { value, ended: LINE_BREAK, added };
        }
        if (parts === null) parts = [];
        parts.push(text.slice(seg, pos));
        added += pos - seg;
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        seg = pos;
        continue;
      }
      pos += 1;
    }
    let value;
    if (parts === null) { value = text.slice(start, pos); added = pos - start; }
    else { parts.push(text.slice(seg, pos)); added += pos - seg; value = parts.join(''); }
    return { value, ended: END, added };
  }

  function parseQuoted() {
    const open = pos;
    const openLine = line;
    let parts = null;
    let seg = open + 1;
    let j = open + 1;
    let scanLine = line;
    let closing = -1;
    while (j < n) {
      const c = text.charCodeAt(j);
      if (c === 34) {
        if (j + 1 < n && text.charCodeAt(j + 1) === 34) {
          if (parts === null) parts = [];
          parts.push(text.slice(seg, j), '"');
          j += 2;
          seg = j;
          continue;
        }
        closing = j;
        break;
      }
      if (c === 13) {
        if (parts === null) parts = [];
        parts.push(text.slice(seg, j), '\n');
        scanLine += 1;
        j += (j + 1 < n && text.charCodeAt(j + 1) === 10) ? 2 : 1;
        seg = j;
        continue;
      }
      if (c === 10) scanLine += 1;
      j += 1;
    }
    if (closing === -1) {
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      pos = open + 1;
      line = openLine;
      const r = parseUnquoted();
      return { value: '"' + r.value, ended: r.ended };
    }
    line = scanLine;
    let value;
    if (parts === null) value = text.slice(open + 1, closing);
    else { parts.push(text.slice(seg, closing)); value = parts.join(''); }
    pos = closing + 1;
    if (pos >= n) return { value, ended: END };
    const c = text.charCodeAt(pos);
    if (c === 44) { pos += 1; return { value, ended: COMMA }; }
    if (c === 10) { pos += 1; line += 1; return { value, ended: LINE_BREAK }; }
    if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    const junk = parseUnquoted();
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return { value: value + junk.value, ended: junk.ended };
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? parseQuoted() : parseUnquoted();
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      const extra = fields.splice(width);
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
