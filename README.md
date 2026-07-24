# 🔔 Bel Ajar — WebApp Jurnal Mengajar Digital

**Bel Ajar** adalah aplikasi Progressive Web App (PWA) *mobile-first* yang dirancang untuk mempermudah guru dalam mencatat jurnal mengajar harian, presensi siswa, input nilai harian, hingga melihat riwayat ketertinggalan materi bagi siswa yang tidak hadir. 

Aplikasi ini dibuat serba praktis supaya bisa diakses langsung lewat layar HP di dalam kelas, tanpa perlu repot bawa laptop atau nulis manual di buku jurnal fisik.

---

## 💥 Masalah yang Diatasi

1. **Jurnal Fisik & Rekap Manual yang Memakan Waktu**  
   Pencatatan di buku kertas rawan rusak/hilang, dan makan waktu lama saat harus merekapitulasi presensi bulanan/semesteran untuk laporan dinas.
2. **Foto Dokumentasi Pembelajaran Bikin Memori HP Penuh**  
   File foto kegiatan mengajar yang ukurannya besar bikin penyimpanan cepat habis. Di Bel Ajar, foto otomatis dikompresi sebelum disimpan ke sistem/cloud.
3. **Format Laporan Harus Resmi (Ber-Kop & Ada TTD Digital)**  
   Mencetak rekap dari HP sering kali acak-acakan. Bel Ajar menyediakan *print preview* standar cetak dokumen resmi lengkap dengan Kop Surat Sekolah/Dinas, 2 Logo Instansi, serta TTD digital & NIP guru yang rapi dan pas di kertas.
4. **Siswa Absen Bingung Ketinggalan Materi**  
   Guru dan siswa sering lupa materi apa yang tertinggal saat siswa tidak masuk. Fitur pelacakan ketertinggalan belajar di aplikasi ini langsung memunculkan materi dan foto dokumentasi pada tanggal siswa tersebut absen.

---

## 🚀 Fitur Utama

- **PWA Mobile-First**: Bisa di-install langsung di HP (Android/iOS) serasa aplikasi native lengkap dengan icon & splash screen bersih.
- **Form Jurnal & Presensi Interaktif**: Input materi mengajar (bisa backdate tanggal), presensi kartu radio button (H/S/I/A), dan input nilai harian.
- **Auto Compress Foto Dokumentasi**: Foto kegiatan pembelajaran dari kamera/galeri otomatis diperkecil ukurannya tanpa mengorbankan kualitas visual.
- **Kelola Data Siswa & Fitur Sortasi**: Manajemen data siswa per kelas serta filter cepat untuk melihat siapa saja siswa yang Sakit, Izin, atau Alfa.
- **Lacak Materi Ketertinggalan Siswa**: Klik ikon peringatan pada nama siswa untuk melihat ringkasan materi & foto dokumentasi saat siswa berhalangan hadir.
- **Review & Edit Full Jurnal**: Bisa memperbarui materi, merevisi status presensi, atau menginput nilai susulan kapan saja dari jurnal terdahulu.
- **Export PDF Laporan Resmi**: Cetak rekap harian, mingguan, bulanan, semester, atau custom tanggal dengan format tabel *zebra-striping* yang rapi, lengkap dengan Kop Surat dan TTD Digital.
- **Keamanan & Proteksi Bot**: Menggunakan Supabase Auth dengan sistem *lockout* (pemblokiran otomatis 24 jam) jika gagal login 3 kali berturut-turut.

---

## 🛠️ Tech Stack

- **Frontend**: React.js + Vite
- **Styling**: Tailwind CSS + Lucide Icons
- **UI Dialog / Notifikasi**: SweetAlert2
- **PWA Support**: Vite PWA Plugin
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

---

## 🍴 Cara Fork & Deploy Sendiri

Kalo mau pakai atau kembangin webapp ini buat sekolah kamu sendiri, ikuti langkah berikut:

### 1. Fork Repository
Klik tombol **Fork** di pojok kanan atas repo ini buat meng-copy proyek ke akun GitHub kamu.

### 2. Setup Supabase Database
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Masuk ke **SQL Editor**, lalu jalankan query untuk membuat tabel `students`, `journals`, `attendance`, `grades`, dan `profiles`.
3. Buat akun guru di menu **Authentication > Users**.
4. Import data siswa sekolahmu ke tabel `students`.

### 3. Deploy ke Vercel
1. Login ke [Vercel](https://vercel.com/) pakai akun GitHub.
2. Tambahkan proyek baru dan impor repo hasil fork tadi.
3. Di bagian **Environment Variables**, isi 2 kunci dari Supabase kamu:
   - `VITE_SUPABASE_URL` = *(URL Project Supabase)*
   - `VITE_SUPABASE_ANON_KEY` = *(Anon API Key Supabase)*
4. Klik **Deploy**. Selesai!

---

*Dibuat fungsional, efisien, dan siap pakai untuk administrasi guru modern.* 🚀
