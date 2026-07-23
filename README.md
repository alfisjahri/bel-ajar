# 🔔 Bel Ajar — WebApp Jurnal Mengajar Digital SMP

**Bel Ajar** adalah webapp Progressive Web App (PWA) *mobile-first* yang gue buat khusus untuk mempermudah pencatatan jurnal harian mengajar, presensi siswa, dan input nilai di tingkat SMP (Kelas 7 Matematika, Kelas 8A/8B Matematika & Koding, Kelas 9A/9B Koding). 

Aplikasi ini dirancang serba praktis biar bisa dipakai langsung dari HP pas lagi di kelas, tanpa ribet bawa laptop atau nulis manual di buku jurnal fisik.

---

## 💥 Masalah yang Diatasi

1. **Jurnal Fisik & Rekap Manual yang Ribet**  
   Pencatatan di buku kertas rawan hilang, kotor, dan makan waktu pas mau bikin rekapitulasi bulanan atau semesteran untuk laporan dinas.
2. **Dokumentasi Foto Bikin Memori HP Penuh**  
   Kalo foto kegiatan mengajar diupload gitu aja, file-nya gede-gede. Di Bel Ajar, semua foto dokumentasi otomatis terkompres sebelum masuk database Supabase.
3. **Format Laporan Harus Resmi Ber-Kop & Ada TTD**  
   Proses cetak laporan sering berantakan pas di-save ke PDF. Bel Ajar punya fitur modal preview dokumen resmi lengkap dengan Kop Surat Dinas/Sekolah, 2 Logo (Pemkab Kutai Barat & SMPN 1 Damai), serta TTD digital dan NIP yang fleksibel tanpa meng-expose data pribadi ke repository publik.
4. **Presensi Siswa Kelamaan Kalo Harus Diketik Satu-satu**  
   Di Bel Ajar, default status siswa pas masuk jurnal adalah **Hadir**. Kalo ada yang berhalangan, tinggal tap radio button **H / S / I / A** yang udah didesain khusus buat layar HP.

---

## 🚀 Fitur Utama

- **PWA Mobile-First**: Bisa di-install langsung di HP Android/iOS serasa aplikasi native (lengkap sama icon & splash screen).
- **Auto Mapping Mapel**: Pilihan mata pelajaran otomatis ngunci/nyesuaiin kelas (Kelas 7 = MTK, Kelas 8 = MTK/Koding, Kelas 9 = Koding).
- **Presensi Radio Card & Nilai Harian**: Tampilan list siswa pakai kartu interaktif yang ramah jempol.
- **Auto Compress Foto Dokumentasi**: Foto kegiatan pembelajaran otomatis diperkecil ukurannya pas di-upload.
- **Kelola Data Siswa (CRUD)**: Bisa cari, tambah, edit, atau hapus nama siswa per kelas langsung dari web.
- **Review Jurnal & Dokumentasi**: Bisa ngeliat foto materi sebelumnya kapan aja meskipun semua siswa hadir (buat nginget materi pekan lalu).
- **Preview & Export PDF Laporan Resmi**: Cetak rekap harian, mingguan, bulanan, semester, atau custom tanggal yang muat pas di kertas A4 dengan Kop Resmi dan TTD Digital.
- **Mode Login & Mode Demo**: Menggunakan Supabase Auth untuk akses penuh guru, dan ketersediaan Mode Demo buat yang mau nyoba-nyoba tanpa login.

---

## 🛠️ Tech Stack

- **Frontend**: React.js + Vite
- **Styling**: Tailwind CSS
- **PWA Support**: Vite PWA Plugin
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel

---

## 🍴 Cara Fork & Deploy Sendiri

Kalo mau pake atau kembangin webapp ini buat sekolahmu sendiri, tinggal ikuti langkah berikut:

### 1. Fork Repository
Klik tombol **Fork** di pojok kanan atas repo ini buat mengkopi proyek ini ke akun GitHub kamu.

### 2. Setup Supabase Database
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Masuk ke menu **SQL Editor**, lalu jalankan query untuk membuat tabel `students`, `journals`, `attendance`, `grades`, dan `profiles`.
3. Bikin user baru di menu **Authentication > Users** untuk login guru.
4. Import data siswamu ke tabel `students` (bisa via CSV langsung dari Google Sheets).

### 3. Deploy ke Vercel
1. Login ke [Vercel](https://vercel.com/) pakai akun GitHub.
2. Tambahkan proyek baru dan impor repo hasil fork tadi.
3. Di bagian **Environment Variables**, tambahkan 2 kunci dari Supabase kamu:
   - `VITE_SUPABASE_URL` = *(URL Project Supabase)*
   - `VITE_SUPABASE_ANON_KEY` = *(Anon API Key Supabase)*
4. Klik **Deploy**. Selesai!

---

*Dibuat santuy tapi fungsional untuk efisiensi mengajar harian.* 🚀
