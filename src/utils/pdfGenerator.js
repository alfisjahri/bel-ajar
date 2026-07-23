export const printHTMLReport = ({ 
  title, 
  subtitle = '',
  headers, 
  rows, 
  teacherName, 
  teacherNip, 
  signatureBase64 
}) => {
  // Buat jendela/pop-up khusus untuk mencetak dokumen
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan Pop-up di browser kamu untuk melakukan Print Preview PDF!');
    return;
  }

  const rowsHTML = rows.map((row) => `
    <tr>
      <td style="text-align: center;">${row[0]}</td>
      <td style="text-align: left; font-weight: 600;">${row[1]}</td>
      <td style="text-align: center; color: ${row[2] === 'Hadir' ? '#15803d' : '#b91c1c'}; font-weight: bold;">${row[2]}</td>
      <td style="text-align: center;">${row[3] || '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 8.5pt;
          line-height: 1.2;
          background: #ffffff;
        }
        .kop-container { text-align: center; margin-bottom: 6px; }
        .kop-title-1 { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .kop-title-2 { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; }
        .kop-school { font-size: 13.5pt; font-weight: bold; text-transform: uppercase; color: #1e3a8a; margin: 2px 0; }
        .kop-address { font-size: 7.5pt; font-style: italic; color: #475569; }
        .line-double {
          border-top: 2px solid #0f172a;
          border-bottom: 0.8px solid #0f172a;
          height: 2px;
          margin: 6px 0 10px 0;
        }
        .doc-title { text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .doc-subtitle { text-align: center; font-size: 8.5pt; color: #334155; margin-bottom: 10px; }
        
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }
        table.data-table th, table.data-table td {
          border: 0.6pt solid #94a3b8;
          padding: 3px 6px;
          font-size: 8pt;
        }
        table.data-table th {
          background-color: #2563eb !important;
          color: #ffffff !important;
          font-weight: bold;
          text-transform: uppercase;
          text-align: center;
          font-size: 7.5pt;
        }
        table.data-table tr:nth-child(even) { background-color: #f8fafc; }
        
        .signature-container {
          margin-top: 14px;
          width: 100%;
          page-break-inside: avoid;
        }
        .sig-box {
          margin-left: 60%;
          width: 40%;
          text-align: left;
          font-size: 8.5pt;
        }
        .sig-space {
          height: 48px;
          margin: 4px 0;
          display: flex;
          align-items: center;
        }
        .sig-img {
          max-height: 48px;
          max-width: 140px;
          object-fit: contain;
        }
        .sig-name { font-weight: bold; text-decoration: underline; font-size: 9pt; }
        .sig-nip { font-size: 8pt; color: #334155; margin-top: 1px; }
      </style>
    </head>
    <body>

      <!-- KOP SURAT RESMI -->
      <div class="kop-container">
        <div class="kop-title-1">Pemerintah Kabupaten Kutai Barat</div>
        <div class="kop-title-2">Dinas Pendidikan dan Kebudayaan</div>
        <div class="kop-school">SMP Negeri 1 Damai</div>
        <div class="kop-address">Jl. Poros Damai, Kecamatan Damai, Kabupaten Kutai Barat, Kalimantan Timur</div>
      </div>
      <div class="line-double"></div>

      <!-- JUDUL LAPORAN -->
      <div class="doc-title">${title}</div>
      ${subtitle ? `<div class="doc-subtitle">${subtitle}</div>` : ''}

      <!-- TABEL DATA SISWA -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 8%;">${headers[0]}</th>
            <th style="width: 54%;">${headers[1]}</th>
            <th style="width: 20%;">${headers[2]}</th>
            <th style="width: 18%;">${headers[3]}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      <!-- SEKSI TANDA TANGAN -->
      <div class="signature-container">
        <div class="sig-box">
          <div>Damai, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style="margin-bottom: 2px;">Guru Mata Pelajaran,</div>
          <div class="sig-space">
            ${signatureBase64 ? `<img src="${signatureBase64}" class="sig-img" alt="TTD Guru" />` : '<div style="height: 40px;"></div>'}
          </div>
          <div class="sig-name">${teacherName || 'NUR ALFI SYAHRI, S.P.'}</div>
          <div class="sig-nip">NIP. ${teacherNip || '-------------------'}</div>
        </div>
      </div>

      <script>
        // Panggil print preview sistem begitu gambar TTD selesai di-load
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>

    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
