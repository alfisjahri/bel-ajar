import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDFReport = ({ title, headers, rows, teacherName, teacherNip, signatureBase64 }) => {
  const doc = new jsPDF();

  // Header Laporan
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), 14, 15);
  doc.setFontSize(10);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  // Tabel Utama
  doc.autoTable({
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] }
  });

  // Tanda Tangan & NIP
  const finalY = doc.lastAutoTable.finalY + 15;
  const rightMargin = 130;

  doc.text('Mengetahui,', rightMargin, finalY);
  doc.text('Guru Mata Pelajaran', rightMargin, finalY + 5);

  if (signatureBase64) {
    doc.addImage(signatureBase64, 'PNG', rightMargin, finalY + 8, 35, 20);
  }

  doc.text(teacherName || 'GURU AMPU', rightMargin, finalY + 33);
  doc.text(`NIP. ${teacherNip || '-------------------'}`, rightMargin, finalY + 38);

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
