import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { compressAndUpload } from './utils/compressor';
import { generatePDFReport } from './utils/pdfGenerator';
import { 
  BookOpen, FileText, LogIn, LogOut, Check, UserCheck, 
  Search, Edit3, Image as ImageIcon, Calendar, Filter, Users, ChevronRight, RefreshCw
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('input'); // 'input', 'edit', 'search', 'report', 'profile'
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profil Guru Auto-Fetch
  const [profile, setProfile] = useState({ full_name: '', nip: '', signature_url: '' });

  // Data Master & State Form Jurnal
  const [selectedClass, setSelectedClass] = useState('7');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [material, setMaterial] = useState('');
  const [photos, setPhotos] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);

  // State Edit Jurnal & History
  const [journalsHistory, setJournalsHistory] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);

  // State Search Per Siswa
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

  // State Filter Rekap
  const [rekapFilter, setRekapFilter] = useState({ type: 'bulanan', month: new Date().getMonth() + 1, class_name: '7', subject: 'Matematika' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto Fetch Profile
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  // Fetch Siswa Real dari Supabase
  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  const fetchStudents = async () => {
    if (isDemo) {
      // Dummy data jika mode demo
      const mock = [
        { id: '1', name: 'ALMITA NAIYA HANISA', class_name: selectedClass },
        { id: '2', name: 'CHAROLYNA ADELYA LESTARI', class_name: selectedClass },
        { id: '3', name: 'CLEVER NAHANIELO ALKARICK', class_name: selectedClass }
      ];
      setStudents(mock);
      initAtt(mock);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_name', selectedClass)
      .order('name', { ascending: true });

    if (!error && data) {
      setStudents(data);
      initAtt(data);
    }
  };

  const initAtt = (studentList) => {
    const att = {};
    studentList.forEach(s => att[s.id] = 'Hadir');
    setAttendance(att);
  };

  // Fetch History Jurnal untuk Menu Edit
  const fetchJournalsHistory = async () => {
    if (isDemo) return;
    const { data } = await supabase.from('journals').select('*').order('created_at', { ascending: false });
    if (data) setJournalsHistory(data);
  };

  useEffect(() => {
    if (activeTab === 'edit') fetchJournalsHistory();
  }, [activeTab]);

  // Handle Simpan Jurnal Baru
  const handleSubmitJurnal = async () => {
    if (isDemo) return alert('Mode Demo: Data tidak tersimpan ke database.');
    if (!material.trim()) return alert('Isi materi pembelajaran terlebih dahulu!');

    setLoading(true);
    let photoUrls = [];
    if (photos.length > 0) {
      photoUrls = await compressAndUpload(photos, supabase);
    }

    const { data: journal, error } = await supabase.from('journals').insert([
      { class_name: selectedClass, subject: selectedSubject, material, photos: photoUrls }
    ]).select().single();

    if (!error && journal) {
      const attRecords = students.map(s => ({
        journal_id: journal.id, student_id: s.id, status: attendance[s.id] || 'Hadir', date: new Date()
      }));
      const gradeRecords = students.filter(s => grades[s.id]).map(s => ({
        journal_id: journal.id, student_id: s.id, score: parseFloat(grades[s.id]), date: new Date()
      }));

      await supabase.from('attendance').insert(attRecords);
      if (gradeRecords.length > 0) await supabase.from('grades').insert(gradeRecords);

      alert('✅ Jurnal Berhasil Disimpan!');
      setMaterial('');
      setPhotos([]);
      setGrades({});
      initAtt(students);
    } else {
      alert('Gagal menyimpan jurnal: ' + error?.message);
    }
    setLoading(false);
  };

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login Gagal: ' + error.message);
  };

  if (!session && !isDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
          <div className="text-center mb-8">
            <div className="bg-blue-100 p-4 rounded-2xl w-20 h-20 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Jurnal Guru Digital</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Sistem Presensi & Nilai SMP Mobile-First</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Email / Username</label>
              <input 
                type="email" placeholder="guru@smp.sch.id" 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={email} onChange={e => setEmail(e.target.value)} required 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">Password</label>
              <input 
                type="password" placeholder="••••••••" 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password} onChange={e => setPassword(e.target.value)} required 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
              Masuk Aplikasi
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <button onClick={() => setIsDemo(true)} className="text-xs text-slate-500 font-semibold hover:text-blue-600 transition-colors">
              Coba Mode Demo (Tanpa Login)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24 max-w-md mx-auto relative shadow-2xl border-x border-slate-200 font-sans">
      
      {/* Top Mobile Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sticky top-0 z-30 shadow-lg rounded-b-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-lg tracking-tight">Jurnal Mengajar SMP</h2>
            <p className="text-[11px] text-blue-100 font-medium">
              {isDemo ? '⚠️ Mode Demo' : `👤 ${profile.full_name || 'Guru SMP'}`}
            </p>
          </div>
          <button 
            onClick={() => { supabase.auth.signOut(); setIsDemo(false); }} 
            className="bg-white/10 p-2 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 space-y-4">

        {/* TAB 1: INPUT JURNAL HARIAN */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Pilih Kelas</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  >
                    <option value="7">Kelas 7 (MTK)</option>
                    <option value="8A">Kelas 8A (MTK/Koding)</option>
                    <option value="8B">Kelas 8B (MTK/Koding)</option>
                    <option value="9A">Kelas 9A (Koding)</option>
                    <option value="9B">Kelas 9B (Koding)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                    value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                  >
                    <option value="Matematika">Matematika</option>
                    <option value="Koding">Koding</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Materi / Catatan Mengajar</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 focus:ring-2 focus:ring-blue-500"
                  placeholder="Tuliskan pembahasan materi hari ini..."
                  value={material} onChange={e => setMaterial(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Foto Dokumen (Otomatis Kompres)</label>
                <input 
                  type="file" multiple accept="image/*" capture="environment"
                  onChange={e => setPhotos(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                />
                {photos.length > 0 && <p className="text-[10px] text-green-600 font-semibold mt-1">✓ {photos.length} foto terpilih</p>}
              </div>
            </div>

            {/* Presensi & Nilai Table */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-extrabold text-slate-800 text-sm">Daftar Siswa ({students.length})</h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-lg">Default: Hadir</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {students.map((student) => (
                  <div key={student.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-800 truncate">{student.name}</p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <select 
                        value={attendance[student.id] || 'Hadir'}
                        onChange={e => setAttendance({...attendance, [student.id]: e.target.value})}
                        className={`text-xs p-1.5 rounded-lg border font-bold ${
                          attendance[student.id] === 'Sakit' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                          attendance[student.id] === 'Izin' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                          attendance[student.id] === 'Alfa' ? 'bg-red-100 border-red-300 text-red-800' :
                          'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <option value="Hadir">Hadir</option>
                        <option value="Sakit">Sakit</option>
                        <option value="Izin">Izin</option>
                        <option value="Alfa">Alfa</option>
                      </select>

                      <input 
                        type="number" placeholder="Nilai" 
                        className="w-14 text-xs p-1.5 border border-slate-200 rounded-lg text-center font-semibold bg-white"
                        onChange={e => setGrades({...grades, [student.id]: e.target.value})}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSubmitJurnal} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>{loading ? 'Menyimpan & Kompres Foto...' : 'Simpan Jurnal Hari Ini'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: EDIT JURNAL & REVIEW FOTO */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Riwayat & Edit Jurnal Mengajar</h3>
            {journalsHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada jurnal tersimpan.</p>
            ) : (
              journalsHistory.map(j => (
                <div key={j.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md mr-2">Kelas {j.class_name}</span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{j.subject}</span>
                      <p className="text-xs text-slate-400 mt-1">{new Date(j.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{j.material}</p>

                  {/* Foto Review Dokumentasi */}
                  {j.photos && j.photos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Foto Dokumentasi ({j.photos.length})
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {j.photos.map((url, idx) => (
                          <img key={idx} src={url} alt="Dokumentasi" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PENCARIAN PER SISWA */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Cek Ketidakhadiran Siswa</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  type="text" placeholder="Ketik nama siswa..." 
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center py-4">Ketik nama siswa untuk melihat rekap ketidakhadiran & cetak PDF.</p>
          </div>
        )}

        {/* TAB 4: PROFIL GURU & EXPORT PDF */}
        {activeTab === 'profile' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-base border-b pb-2">Profil & TTD Digital</h3>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Nama Lengkap Guru (Lengkap Gelar)</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                value={profile.full_name || ''} 
                onChange={e => setProfile({...profile, full_name: e.target.value})}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">NIP Guru</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                value={profile.nip || ''} 
                onChange={e => setProfile({...profile, nip: e.target.value})}
              />
            </div>

            {profile.signature_url && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 mb-1">Tanda Tangan Tersimpan:</p>
                <img src={profile.signature_url} alt="TTD" className="h-20 mx-auto object-contain" />
              </div>
            )}

            <button 
              onClick={() => {
                generatePDFReport({
                  title: `Laporan Rekap Presensi Kelas ${selectedClass}`,
                  headers: ['No', 'Nama Siswa', 'Status Presensi', 'Nilai'],
                  rows: students.map((s, idx) => [idx + 1, s.name, attendance[s.id] || 'Hadir', grades[s.id] || '-']),
                  teacherName: profile.full_name,
                  teacherNip: profile.nip,
                  signatureBase64: profile.signature_url
                });
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Test Export PDF Laporan</span>
            </button>
          </div>
        )}

      </div>

      {/* Bottom Floating Navigation (Mobile Native Style) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-lg border-t border-slate-200/80 flex justify-around p-2 z-30 rounded-t-2xl shadow-lg">
        <button onClick={() => setActiveTab('input')} className={`p-2 flex flex-col items-center transition-all ${activeTab === 'input' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1">Jurnal</span>
        </button>
        <button onClick={() => setActiveTab('edit')} className={`p-2 flex flex-col items-center transition-all ${activeTab === 'edit' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400'}`}>
          <Edit3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Review</span>
        </button>
        <button onClick={() => setActiveTab('search')} className={`p-2 flex flex-col items-center transition-all ${activeTab === 'search' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-1">Siswa</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`p-2 flex flex-col items-center transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-105 font-bold' : 'text-slate-400'}`}>
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] mt-1">Profil</span>
        </button>
      </div>

    </div>
  );
}
