import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDFReport = ({ 
  title, 
  subtitle = '',
  headers, 
  rows, 
  teacherName, 
  teacherNip, 
  signatureBase64 
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // KOP SURAT RESMI DINAS & SEKOLAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH KABUPATEN KUTAI BARAT', 105, 12, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 17, { align: 'center' });
  doc.setFontSize(13);
  doc.text('SMP NEGERI 1 DAMAI', 105, 23, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Alamat: Jl. Poros Damai, Kecamatan Damai, Kabupaten Kutai Barat, Kalimantan Timur', 105, 27, { align: 'center' });

  // Garis Kop Surat Ganda
  doc.setLineWidth(0.8);
  doc.line(14, 30, 196, 30);
  doc.setLineWidth(0.2);
  doc.line(14, 31, 196, 31);

  // JUDUL LAPORAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 105, 37, { align: 'center' });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, 105, 41, { align: 'center' });
  }

  // TABEL REKAP SISWA (Ukuran compact muat 1 halaman A4)
  const startY = subtitle ? 45 : 42;
  doc.autoTable({
    startY: startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.2, halign: 'left' },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' }
    },
    margin: { left: 14, right: 14 }
  });

  // TANDA TANGAN & NIP (Posisi Kanan Bawah)
  let finalY = doc.lastAutoTable.finalY + 6;
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  const rightMargin = 135;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Damai, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, rightMargin, finalY);
  doc.text('Guru Mata Pelajaran,', rightMargin, finalY + 4);

  // Render TTD jika Base64 tersedia
  if (signatureBase64 && signatureBase64.startsWith('data:image')) {
    try {
      doc.addImage(signatureBase64, 'PNG', rightMargin, finalY + 5, 35, 16);
    } catch (e) {
      console.error('Error rendering signature:', e);
    }
  }

  const nameY = (signatureBase64 && signatureBase64.startsWith('data:image')) ? finalY + 23 : finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName || 'NUR ALFI SYAHRI, S.P.', rightMargin, nameY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${teacherNip || '-------------------'}`, rightMargin, nameY + 4);

  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
