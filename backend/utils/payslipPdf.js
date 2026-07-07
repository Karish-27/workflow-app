const PDFDocument = require('pdfkit');

function formatCurrency(amount, currency = 'INR') {
  const n = Number(amount || 0);
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return symbol + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function streamPayslip(res, { payment, worker, organization }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payslip-${worker?.name?.replace(/\s+/g, '_') || 'worker'}-${formatDate(
      payment.periodEnd
    ).replace(/\s+/g, '_')}.pdf"`
  );

  doc.pipe(res);

  const currency = organization?.currency || 'INR';

  // ── Header ──
  doc.fontSize(20).fillColor('#1A1A1A').font('Helvetica-Bold')
    .text(organization?.name || 'WorkFlow', { align: 'left' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#6B6B6B').font('Helvetica')
    .text(organization?.address || '', { align: 'left' });
  if (organization?.phone) {
    doc.text(`Phone: ${organization.phone}`, { align: 'left' });
  }
  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E0D8').stroke();
  doc.moveDown(0.6);

  doc.fontSize(16).fillColor('#1A1A1A').font('Helvetica-Bold').text('PAYSLIP', { align: 'center' });
  doc.fontSize(10).fillColor('#6B6B6B').font('Helvetica')
    .text(`For period ${formatDate(payment.periodStart)} – ${formatDate(payment.periodEnd)}`, { align: 'center' });
  doc.moveDown(1);

  // ── Worker block ──
  const labelStyle = (text) => doc.fontSize(9).fillColor('#6B6B6B').font('Helvetica').text(text);
  const valueStyle = (text) => doc.fontSize(11).fillColor('#1A1A1A').font('Helvetica-Bold').text(text);

  const leftCol = 50;
  const rightCol = 320;
  const startY = doc.y;

  doc.fontSize(9).fillColor('#6B6B6B').text('Worker', leftCol, startY);
  doc.fontSize(11).fillColor('#1A1A1A').font('Helvetica-Bold').text(worker?.name || '—', leftCol, startY + 12);
  doc.fontSize(9).fillColor('#6B6B6B').font('Helvetica').text(worker?.role || '', leftCol, startY + 28);
  if (worker?.phone) doc.text(worker.phone, leftCol, startY + 42);

  doc.fontSize(9).fillColor('#6B6B6B').text('Payment date', rightCol, startY);
  doc.fontSize(11).fillColor('#1A1A1A').font('Helvetica-Bold').text(formatDate(payment.paymentDate), rightCol, startY + 12);
  doc.fontSize(9).fillColor('#6B6B6B').font('Helvetica').text(`Method: ${payment.paymentMethod}`, rightCol, startY + 28);
  if (payment.transactionRef) doc.text(`Ref: ${payment.transactionRef}`, rightCol, startY + 42);

  doc.moveDown(4);

  // ── Attendance summary table ──
  const tableStartY = doc.y;
  const col = [50, 200, 350, 480];
  const rowHeight = 22;

  const drawHeader = () => {
    doc.rect(50, doc.y, 495, rowHeight).fill('#F7F4EF');
    doc.fillColor('#1A1A1A').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', col[0] + 8, doc.y + 6);
    doc.text('Days / Hours', col[1] + 8, doc.y + 6, { width: 140 });
    doc.text('Rate', col[2] + 8, doc.y + 6, { width: 120 });
    doc.text('Amount', col[3] + 8, doc.y + 6, { width: 80, align: 'right' });
    doc.y += rowHeight;
  };

  const drawRow = (label, qty, rate, amount, opts = {}) => {
    const y = doc.y;
    if (opts.bg) doc.rect(50, y, 495, rowHeight).fill(opts.bg);
    doc.fillColor('#1A1A1A').fontSize(10).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, col[0] + 8, y + 6);
    doc.text(String(qty ?? ''), col[1] + 8, y + 6);
    doc.text(rate ? formatCurrency(rate, currency) : '—', col[2] + 8, y + 6);
    doc.text(amount === null ? '—' : formatCurrency(amount, currency), col[3] + 8, y + 6, {
      width: 60,
      align: 'right',
    });
    doc.y = y + rowHeight;
  };

  const dailyRate = payment.totalWorkingDays > 0
    ? (payment.grossAmount + (payment.deductions || 0)) / Math.max(1, payment.presentDays + (payment.halfDays || 0) * 0.5)
    : 0;

  drawHeader();
  drawRow('Working days in period', payment.totalWorkingDays, null, null);
  drawRow('Present days', payment.presentDays, dailyRate, payment.grossAmount, {});
  if (payment.halfDays) drawRow('Half days', payment.halfDays, null, null);
  if (payment.leaveDays) drawRow('Leave days', payment.leaveDays, null, null);
  if (payment.overtimeHours) drawRow('Overtime hours', payment.overtimeHours, null, null);

  // ── Earnings / Deductions ──
  doc.moveDown(0.6);
  doc.rect(50, doc.y, 495, rowHeight).fill('#FFF8F4');
  doc.fillColor('#FF5C3A').fontSize(11).font('Helvetica-Bold')
    .text('Earnings & Deductions', col[0] + 8, doc.y + 6);
  doc.y += rowHeight;

  drawRow('Gross amount', '', null, payment.grossAmount, { bold: true });
  if (payment.deductions) drawRow('Less: Absence / deductions', '', null, -payment.deductions);
  if (payment.advance) drawRow('Less: Advance recovered', '', null, -payment.advance);

  // ── Net ──
  doc.moveDown(0.4);
  const netY = doc.y;
  doc.rect(50, netY, 495, 36).fill('#1A1A1A');
  doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold').text('NET PAYABLE', col[0] + 8, netY + 12);
  doc.fontSize(15).text(formatCurrency(payment.netAmount, currency), col[3] - 60, netY + 10, {
    width: 140,
    align: 'right',
  });
  doc.y = netY + 36;

  if (payment.notes) {
    doc.moveDown(1).fontSize(9).fillColor('#6B6B6B').font('Helvetica')
      .text('Notes: ' + payment.notes, 50, doc.y, { width: 495 });
  }

  // ── Footer ──
  doc.moveDown(3);
  doc.fontSize(8).fillColor('#9B9B9B').font('Helvetica')
    .text('This is a computer-generated payslip and does not require a signature.', 50, doc.y, {
      align: 'center',
      width: 495,
    });

  doc.end();
}

module.exports = { streamPayslip };
