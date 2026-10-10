// Pure JavaScript RFC-4180 CSV parser and serializer with zero dependencies

function parseCSV(text) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n') {
        row.push(cell.trim());
        if (row.length > 0 && row.some(c => c !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) {
      lines.push(row);
    }
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));
  const results = [];

  for (let r = 1; r < lines.length; r++) {
    const obj = {};
    const currRow = lines[r];
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = currRow[c] !== undefined ? currRow[c] : '';
    }
    results.push(obj);
  }

  return results;
}

function stringifyCSV(rows, headers) {
  if (!rows || rows.length === 0) return '';
  
  const cols = headers || Object.keys(rows[0]);
  const headerLine = cols.map(c => escapeCSVCell(c)).join(',');
  
  const dataLines = rows.map(row => {
    return cols.map(c => {
      const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
      return escapeCSVCell(val);
    }).join(',');
  });

  return [headerLine, ...dataLines].join('\r\n');
}

function escapeCSVCell(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

module.exports = {
  parseCSV,
  stringifyCSV
};
