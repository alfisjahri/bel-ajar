import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper konversi URL gambar (TTD/Logo) ke Base64 agar jsPDF bisa me-render gambar dari Supabase
const urlToBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const generatePDFReport = async ({ 
  title, 
  subtitle = '',
  headers, 
  rows, 
  teacherName, 
  teacherNip, 
  signatureUrl 
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // KOP SURAT RESMI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH KABUPATEN KUTAI BARAT', 105, 12, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 17, { align: 'center' });
  doc.setFontSize(13);
  doc.text('SMP NEGERI 1 DAMAI', 105, 23, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Alamat: Jl. Poros Damai, Kecamatan Damai, Kabupaten Kutai Barat', 105, 27, { align: 'center' });

  // Garis Kop Surat
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

  // TABEL DATA SISWA (Compact agar muat 1 halaman)
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

  // TANDA TANGAN & NIP
  let finalY = doc.lastAutoTable.finalY + 6;
  
  // Jika tabel terlalu panjang, pindahkan TTD ke halaman baru secara rapi
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  const rightMargin = 135;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Damai, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, rightMargin, finalY);
  doc.text('Guru Mata Pelajaran,', rightMargin, finalY + 4);

  // Load & tempel TTD dari Supabase
  if (signatureUrl) {
    const sigBase64 = await urlToBase64(signatureUrl);
    if (sigBase64) {
      doc.addImage(sigBase64, 'PNG', rightMargin, finalY + 5, 32, 16);
    }
  }

  const nameY = signatureUrl ? finalY + 23 : finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.text(teacherName || 'NUR ALFI SYAHRI, S.P.', rightMargin, nameY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${teacherNip || '-------------------'}`, rightMargin, nameY + 4);

  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};
