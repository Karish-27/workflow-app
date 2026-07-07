function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(headers, rows) {
  const out = [];
  out.push(headers.map(escapeCell).join(','));
  for (const row of rows) {
    out.push(row.map(escapeCell).join(','));
  }
  return out.join('\n');
}

function sendCsv(res, filename, headers, rows) {
  const csv = toCsv(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

module.exports = { toCsv, sendCsv };
