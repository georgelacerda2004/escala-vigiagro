import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportExcel(rows, filename = 'escala.xlsx') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Escala');
  XLSX.writeFile(wb, filename);
}

export function exportPDF(columns, rows, title = 'Escala GRU') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => r[c.key] ?? '')),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function printElement(html, title = 'Escala GRU') {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(
    `<html><head><title>${title}</title><style>
      body{font-family:sans-serif;padding:20px}
      table{border-collapse:collapse;width:100%;font-size:11px}
      th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
      th{background:#2563eb;color:#fff}
    </style></head><body><h2>${title}</h2>${html}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}
