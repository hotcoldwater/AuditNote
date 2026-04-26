import { Fragment } from 'react';

type TableBlock = {
  type: 'table';
  header: string[];
  rows: string[][];
};

type ParagraphBlock = {
  type: 'paragraph';
  text: string;
};

type ContentBlock = TableBlock | ParagraphBlock;

function isTableSeparator(line: string) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line.trim());
}

function isTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.includes('|') && !trimmed.startsWith('http');
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseContent(value: string) {
  const lines = String(value ?? '').replace(/\r/g, '').split('\n');
  const blocks: ContentBlock[] = [];
  let paragraphBuffer: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    const text = paragraphBuffer.join('\n').trim();
    if (text) {
      blocks.push({ type: 'paragraph', text });
    }
    paragraphBuffer = [];
  };

  while (index < lines.length) {
    const current = lines[index] ?? '';
    const next = lines[index + 1] ?? '';

    if (isTableRow(current) && isTableSeparator(next)) {
      flushParagraph();
      const header = parseTableRow(current);
      index += 2;
      const rows: string[][] = [];

      while (index < lines.length && isTableRow(lines[index] ?? '')) {
        rows.push(parseTableRow(lines[index] ?? ''));
        index += 1;
      }

      blocks.push({ type: 'table', header, rows });
      continue;
    }

    if (!current.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraphBuffer.push(current);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

export function RichTextContent({ value }: { value: string }) {
  const blocks = parseContent(value);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'paragraph') {
          return (
            <div key={`paragraph-${blockIndex}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
              {block.text}
            </div>
          );
        }

        return (
          <div key={`table-${blockIndex}`} style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                lineHeight: 1.6,
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th
                      key={`head-${cellIndex}`}
                      style={{
                        border: '1px solid #d7e0ee',
                        backgroundColor: '#eef3fb',
                        color: '#173d7a',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {block.header.map((_, cellIndex) => (
                      <td
                        key={`cell-${rowIndex}-${cellIndex}`}
                        style={{
                          border: '1px solid #d7e0ee',
                          padding: '10px 12px',
                          verticalAlign: 'top',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'keep-all',
                          backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fbff',
                        }}
                      >
                        {row[cellIndex] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
