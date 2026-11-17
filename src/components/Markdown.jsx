import { useMemo } from 'react';

// Small Markdown renderer for SEO Assistant answers. Handles what Claude
// actually writes: paragraphs, **bold**, *italic*, `code`, [links](url),
// bullet and numbered lists (one nested level), headings, tables and code
// blocks. Builds React elements directly (never raw HTML), so nothing in
// an answer can inject markup or scripts. Only http/https links render.

const SAFE_URL = /^https?:\/\//i;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HEADING_RE = /^(#{1,4})\s+(.*)$/;
const INLINE_RE = /(`[^`]+`)|(\*\*(?:[^*]|\*(?!\*))+?\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*?\*)/;

const codeStyle = {
  background: 'var(--slate-soft)', borderRadius: 4, padding: '1px 5px', fontSize: '0.92em'
};

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

export function parseBlocks(src) {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Code block
    if (line.trim().startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      i++;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    // Heading
    const h = line.match(HEADING_RE);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // Table
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // List
    const first = line.match(LIST_RE);
    if (first) {
      const ordered = /\d/.test(first[2]);
      const start = ordered ? parseInt(first[2], 10) || 1 : 1;
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(LIST_RE);
        if (m) {
          const indent = m[1].replace(/\t/g, '  ').length;
          if (indent >= 2 && items.length) items[items.length - 1].children.push(m[3]);
          else items.push({ text: m[3], children: [] });
          i++;
        } else if (l.trim() && /^\s{2,}\S/.test(l) && items.length) {
          // Wrapped continuation line of the previous item
          const last = items[items.length - 1];
          if (last.children.length) last.children[last.children.length - 1] += ' ' + l.trim();
          else last.text += ' ' + l.trim();
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }

    // Paragraph
    const para = [line.trim()];
    i++;
    while (
      i < lines.length && lines[i].trim()
      && !LIST_RE.test(lines[i]) && !HEADING_RE.test(lines[i])
      && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('|')
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'para', text: para.join(' ') });
  }
  return blocks;
}

function renderInline(text, keyPrefix = 'i') {
  const out = [];
  let rest = String(text || '');
  let k = 0;
  while (rest.length) {
    const m = rest.match(INLINE_RE);
    if (!m) { out.push(rest); break; }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${k++}`;
    if (m[1]) {
      out.push(<code key={key} className="it-mono" style={codeStyle}>{tok.slice(1, -1)}</code>);
    } else if (m[2]) {
      out.push(<strong key={key} style={{ fontWeight: 600 }}>{renderInline(tok.slice(2, -2), key)}</strong>);
    } else if (m[3]) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (lm && SAFE_URL.test(lm[2])) {
        out.push(
          <a key={key} href={lm[2]} target="_blank" rel="noopener noreferrer"
             style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
            {lm[1]}
          </a>
        );
      } else {
        out.push(lm ? lm[1] : tok);
      }
    } else if (m[4]) {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

function renderBlock(b, i) {
  const key = `b${i}`;
  switch (b.type) {
    case 'heading':
      return (
        <div key={key} style={{ fontSize: b.level <= 2 ? 15 : 14, fontWeight: 600, margin: '14px 0 6px' }}>
          {renderInline(b.text, key)}
        </div>
      );
    case 'code':
      return (
        <pre key={key} className="it-mono" style={{
          ...codeStyle, padding: '10px 12px', margin: '0 0 10px', overflowX: 'auto', whiteSpace: 'pre'
        }}>
          {b.text}
        </pre>
      );
    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '0 0 12px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '60%' }}>
            <thead>
              <tr>
                {b.header.map((c, j) => (
                  <th key={j} style={{
                    textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border-strong)',
                    fontWeight: 600, color: 'var(--ink2)', whiteSpace: 'nowrap'
                  }}>
                    {renderInline(c, `${key}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((c, j) => (
                    <td key={j} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      {renderInline(c, `${key}r${r}c${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag key={key} start={b.ordered ? b.start : undefined}
             style={{ margin: '0 0 10px', paddingLeft: 22, listStyle: b.ordered ? 'decimal' : 'disc' }}>
          {b.items.map((item, j) => (
            <li key={j} style={{ margin: '3px 0' }}>
              {renderInline(item.text, `${key}l${j}`)}
              {item.children.length > 0 && (
                <ul style={{ margin: '3px 0', paddingLeft: 20, listStyle: 'circle' }}>
                  {item.children.map((c, n) => (
                    <li key={n} style={{ margin: '2px 0' }}>{renderInline(c, `${key}l${j}c${n}`)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Tag>
      );
    }
    default:
      return <p key={key} style={{ margin: '0 0 10px' }}>{renderInline(b.text, key)}</p>;
  }
}

export function Markdown({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
      {blocks.map(renderBlock)}
    </div>
  );
}