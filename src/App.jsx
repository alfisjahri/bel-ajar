import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { compressAndUpload } from './utils/compressor';
import { 
  BookOpen, FileText, LogOut, Check, UserCheck, 
  Search, Edit3, Image as ImageIcon, Users, RefreshCw,
  Plus, Trash, Edit, Save, X, Download, Eye, Printer
} from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profil Guru
  const [profile, setProfile] = useState({ 
    full_name: localStorage.getItem('teacher_name') || '', 
    nip: localStorage.getItem('teacher_nip') || '', 
    signature_url: localStorage.getItem('teacher_sig') || '' 
  });

  // Form State Jurnal
  const [selectedClass, setSelectedClass] = useState('7');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [material, setMaterial] = useState('');
  const [photos, setPhotos] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  // Filter Rekap Laporan & Mapel Laporan
  const [reportPeriod, setReportPeriod] = useState('bulanan');
  const [reportClass, setReportClass] = useState('7');
  const [reportSubject, setReportSubject] = useState('Matematika');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal Print Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Management Siswa
  const [allStudents, setAllStudents] = useState([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', class_name: '7' });
  const [editingStudent, setEditingStudent] = useState(null);

  // History Jurnal
  const [journalsHistory, setJournalsHistory] = useState([]);

  // 🔥 LOGIKA MAPEL KETAT - TAB JURNAL
  useEffect(() => {
    if (selectedClass === '7') {
      setSelectedSubject('Matematika');
    } else if (selectedClass === '9A' || selectedClass === '9B') {
      setSelectedSubject('Koding');
    } else if (selectedClass === '8A' || selectedClass === '8B') {
      if (selectedSubject !== 'Matematika' && selectedSubject !== 'Koding') {
        setSelectedSubject('Matematika');
      }
    }
  }, [selectedClass]);

  // 🔥 LOGIKA MAPEL KETAT - TAB PROFIL / REKAP LAPORAN
  useEffect(() => {
    if (reportClass === '7') {
      setReportSubject('Matematika');
    } else if (reportClass === '9A' || reportClass === '9B') {
      setReportSubject('Koding');
    } else if (reportClass === '8A' || reportClass === '8B') {
      if (reportSubject !== 'Matematika' && reportSubject !== 'Koding') {
        setReportSubject('Matematika');
      }
    }
  }, [reportClass]);

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

  const fetchProfile = async (userId) => {
    try {
      let { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        if (data.full_name) localStorage.setItem('teacher_name', data.full_name);
        if (data.nip) localStorage.setItem('teacher_nip', data.nip);
        if (data.signature_url) localStorage.setItem('teacher_sig', data.signature_url);
      }
    } catch (err) {
      console.error('Gagal fetch profil:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!session) return alert('Kamu harus login terlebih dahulu!');
    setLoading(true);

    const updates = {
      id: session.user.id,
      full_name: profile.full_name,
      nip: profile.nip,
      signature_url: profile.signature_url,
      updated_at: new Date()
    };

    localStorage.setItem('teacher_name', profile.full_name);
    localStorage.setItem('teacher_nip', profile.nip);
    if (profile.signature_url) localStorage.setItem('teacher_sig', profile.signature_url);

    const { error } = await supabase.from('profiles').upsert(updates);
    setLoading(false);

    if (!error) {
      alert('✅ Profil & NIP tersimpan aman!');
    } else {
      alert('Gagal menyimpan profil: ' + error.message);
    }
  };

  // UPLOAD TTD BASE64
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setProfile(prev => ({ ...prev, signature_url: base64String }));
      localStorage.setItem('teacher_sig', base64String);
      alert('✅ Gambar TTD berhasil dimuat! Klik "Simpan Profil Permanen" di bawah.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchStudentsByClass(selectedClass);
  }, [selectedClass, isDemo]);

  const fetchStudentsByClass = async (className) => {
    setFetchingStudents(true);
    if (isDemo) {
      const mockData = [
        { id: '1', name: 'AERELLYN BELVIA', class_name: className },
        { id: '2', name: 'AFIFATUL AZIZAH', class_name: className }
      ];
      setStudents(mockData);
      initAttendance(mockData);
      setFetchingStudents(false);
      return;
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_name', className)
      .order('name', { ascending: true });

    if (!error && data) {
      setStudents(data);
      initAttendance(data);
    } else {
      setStudents([]);
    }
    setFetchingStudents(false);
  };

  const fetchAllStudents = async () => {
    if (isDemo) return;
    const { data } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (data) setAllStudents(data);
  };

  useEffect(() => {
    if (activeTab === 'siswa') fetchAllStudents();
  }, [activeTab]);

  // CRUD SISWA
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;

    const { error } = await supabase.from('students').insert([
      { name: newStudent.name.toUpperCase(), class_name: newStudent.class_name }
    ]);

    if (!error) {
      alert('Siswa berhasil ditambahkan!');
      setNewStudent({ name: '', class_name: '7' });
      setIsAddingStudent(false);
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      alert('Gagal menambah siswa: ' + error.message);
    }
  };

  const handleUpdateStudent = async (id) => {
    const { error } = await supabase.from('students').update({
      name: editingStudent.name.toUpperCase(),
      class_name: editingStudent.class_name
    }).eq('id', id);

    if (!error) {
      alert('Data siswa berhasil diperbarui!');
      setEditingStudent(null);
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      alert('Gagal memperbarui siswa: ' + error.message);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus siswa ${name}?`)) return;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      alert('Siswa terhapus!');
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      alert('Gagal menghapus siswa: ' + error.message);
    }
  };

  const initAttendance = (studentList) => {
    const att = {};
    studentList.forEach(s => att[s.id] = 'Hadir');
    setAttendance(att);
  };

  const handleSubmitJurnal = async () => {
    if (isDemo) return alert('Mode Demo: Data tidak tersimpan.');
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

      alert('✅ Jurnal Bel Ajar Berhasil Disimpan!');
      setMaterial('');
      setPhotos([]);
      setGrades({});
      initAttendance(students);
    } else {
      alert('Gagal menyimpan jurnal: ' + error?.message);
    }
    setLoading(false);
  };

  // PREPARE PREVIEW CETAK
  const handleOpenPrintPreview = (title, subtitle, rows) => {
    setPreviewData({
      title,
      subtitle,
      rows,
      teacherName: profile.full_name || 'NUR ALFI SYAHRI, S.P.',
      teacherNip: profile.nip || '-------------------',
      signatureUrl: profile.signature_url
    });
    setShowPreviewModal(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login Gagal: ' + error.message);
  };

  if (!session && !isDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-700 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20">
          <div className="text-center mb-6">
            <div className="bg-blue-50 p-3 rounded-2xl w-20 h-20 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <img 
                src="/logo.png" 
                alt="Bel Ajar Logo" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/512/3429/3429149.png'; }} 
                className="w-14 h-14 object-contain"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Bel Ajar</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Jurnal Mengajar Digital SMPN 1 Damai</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Email / Username</label>
              <input 
                type="email" placeholder="guru@smp.sch.id" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                value={email} onChange={e => setEmail(e.target.value)} required 
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Password</label>
              <input 
                type="password" placeholder="••••••••" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                value={password} onChange={e => setPassword(e.target.value)} required 
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all">
              Masuk Aplikasi
            </button>
          </form>

          <div className="mt-5 text-center border-t border-slate-100 pt-3">
            <button onClick={() => setIsDemo(true)} className="text-xs text-slate-500 font-semibold hover:text-blue-600">
              Masuk Mode Demo (Tanpa Login)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAllStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-24 max-w-md mx-auto relative shadow-2xl border-x border-slate-200 font-sans">
      
      {/* Top Mobile Bar (no-print) */}
      <div className="no-print bg-blue-600 text-white p-4 sticky top-0 z-30 shadow-md rounded-b-2xl flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Bel Ajar" 
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/512/3429/3429149.png'; }} 
            className="w-9 h-9 object-contain bg-white rounded-xl p-1"
          />
          <div>
            <h2 className="font-black text-lg tracking-tight leading-tight">Bel Ajar</h2>
            <p className="text-[10px] text-blue-100">
              {isDemo ? '⚠️ Mode Demo' : `👤 ${profile.full_name || 'Guru SMP'}`}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { supabase.auth.signOut(); setIsDemo(false); }} 
          className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"
        >
          <LogOut className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Main Content (no-print) */}
      <div className="no-print p-4 space-y-4">

        {/* TAB 1: INPUT JURNAL */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Kelas</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8A">Kelas 8A</option>
                    <option value="8B">Kelas 8B</option>
                    <option value="9A">Kelas 9A</option>
                    <option value="9B">Kelas 9B</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    value={selectedSubject} 
                    onChange={e => setSelectedSubject(e.target.value)}
                  >
                    {(selectedClass === '7' || selectedClass === '8A' || selectedClass === '8B') && (
                      <option value="Matematika">Matematika</option>
                    )}
                    {(selectedClass === '8A' || selectedClass === '8B' || selectedClass === '9A' || selectedClass === '9B') && (
                      <option value="Koding">Koding</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Materi / Ringkasan Mengajar</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs h-20"
                  placeholder="Tuliskan materi pembelajaran hari ini..."
                  value={material} onChange={e => setMaterial(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Foto Dokumentasi (Auto Compress)</label>
                <input 
                  type="file" multiple accept="image/*" capture="environment"
                  onChange={e => setPhotos(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600"
                />
              </div>
            </div>

            {/* Presensi Siswa */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-slate-800 text-xs">Siswa Kelas {selectedClass} ({students.length})</h3>
                </div>
                {fetchingStudents && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              </div>

              {students.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-6">Tidak ada data siswa untuk Kelas {selectedClass}</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div key={student.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <p className="font-bold text-xs text-slate-800 truncate flex-1">{student.name}</p>

                      <div className="flex items-center space-x-1.5">
                        <select 
                          value={attendance[student.id] || 'Hadir'}
                          onChange={e => setAttendance({...attendance, [student.id]: e.target.value})}
                          className={`text-[11px] p-1 rounded-lg border font-bold ${
                            attendance[student.id] === 'Sakit' ? 'bg-amber-100 text-amber-800' :
                            attendance[student.id] === 'Izin' ? 'bg-blue-100 text-blue-800' :
                            attendance[student.id] === 'Alfa' ? 'bg-red-100 text-red-800' :
                            'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alfa">Alfa</option>
                        </select>

                        <input 
                          type="number" placeholder="Nilai" 
                          className="w-12 text-xs p-1 border rounded-lg text-center font-semibold bg-white"
                          onChange={e => setGrades({...grades, [student.id]: e.target.value})}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={handleSubmitJurnal} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-extrabold shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
            >
              <Check className="w-5 h-5" />
              <span>{loading ? 'Menyimpan Jurnal...' : 'Simpan Jurnal Hari Ini'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: REVIEW JURNAL */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-xs">Riwayat Jurnal Mengajar Bel Ajar</h3>
            {journalsHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada jurnal tersimpan.</p>
            ) : (
              journalsHistory.map(j => (
                <div key={j.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md mr-1">Kelas {j.class_name}</span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{j.subject}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">{j.material}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: MANAGEMENT SISWA */}
        {activeTab === 'siswa' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Kelola Data Siswa</h3>
                <button 
                  onClick={() => setIsAddingStudent(!isAddingStudent)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Siswa</span>
                </button>
              </div>

              {/* Form Tambah Siswa */}
              {isAddingStudent && (
                <form onSubmit={handleAddStudent} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-700">Tambah Siswa Baru</p>
                  <input 
                    type="text" placeholder="Nama Lengkap Siswa"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    required
                  />
                  <div className="flex gap-2">
                    <select 
                      className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold flex-1"
                      value={newStudent.class_name} onChange={e => setNewStudent({...newStudent, class_name: e.target.value})}
                    >
                      <option value="7">Kelas 7</option>
                      <option value="8A">Kelas 8A</option>
                      <option value="8B">Kelas 8B</option>
                      <option value="9A">Kelas 9A</option>
                      <option value="9B">Kelas 9B</option>
                    </select>
                    <button type="submit" className="bg-emerald-600 text-white px-4 text-xs font-bold rounded-lg">Simpan</button>
                    <button type="button" onClick={() => setIsAddingStudent(false)} className="bg-slate-200 text-slate-700 px-3 text-xs font-bold rounded-lg">Batal</button>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" placeholder="Ketik nama atau kelas siswa..." 
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  value={searchStudentQuery} onChange={e => setSearchStudentQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List Semua Siswa */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold px-1">Total Siswa: {filteredAllStudents.length}</p>
              {filteredAllStudents.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-6 bg-white rounded-2xl border">Siswa tidak ditemukan.</p>
              ) : (
                filteredAllStudents.map(student => (
                  <div key={student.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
                    {editingStudent?.id === student.id ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          className="p-1.5 border rounded-lg text-xs font-semibold flex-1"
                          value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                        />
                        <select 
                          className="p-1.5 border rounded-lg text-xs font-bold"
                          value={editingStudent.class_name} onChange={e => setEditingStudent({...editingStudent, class_name: e.target.value})}
                        >
                          <option value="7">7</option>
                          <option value="8A">8A</option>
                          <option value="8B">8B</option>
                          <option value="9A">9A</option>
                          <option value="9B">9B</option>
                        </select>
                        <button onClick={() => handleUpdateStudent(student.id)} className="text-emerald-600 p-1"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingStudent(null)} className="text-slate-400 p-1"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{student.name}</p>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">Kelas {student.class_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => handleOpenPrintPreview(
                              `REKAP PRESENSI SISWA`,
                              `Nama: ${student.name} | Kelas: ${student.class_name}`,
                              [[1, new Date().toLocaleDateString('id-ID'), 'Hadir (Default)', '-']]
                            )} 
                            title="Preview PDF Siswa"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingStudent(student)} className="p-1.5 text-slate-500 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteStudent(student.id, student.name)} className="p-1.5 text-slate-400 hover:text-red-600">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROFIL GURU & EXPORT REKAP PERIODIK */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm border-b pb-2">Opsi Filter Rekap Laporan PDF</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Periode Laporan</label>
                  <select 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    value={reportPeriod} onChange={e => setReportPeriod(e.target.value)}
                  >
                    <option value="harian">Harian (Hari Ini)</option>
                    <option value="mingguan">Mingguan (7 Hari)</option>
                    <option value="bulanan">Bulanan (Bulan Ini)</option>
                    <option value="semester">Semester Ini</option>
                    <option value="custom">Tentukan Tanggal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Kelas Laporan</label>
                  <select 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    value={reportClass} onChange={e => setReportClass(e.target.value)}
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8A">Kelas 8A</option>
                    <option value="8B">Kelas 8B</option>
                    <option value="9A">Kelas 9A</option>
                    <option value="9B">Kelas 9B</option>
                  </select>
                </div>
              </div>

              {/* 🔥 FIX: DROPDOWN MAPEL DI TAB PROFIL BISA DIPILIH SPESIFIK */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran Laporan</label>
                <select 
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  value={reportSubject} onChange={e => setReportSubject(e.target.value)}
                >
                  {(reportClass === '7' || reportClass === '8A' || reportClass === '8B') && (
                    <option value="Matematika">Matematika</option>
                  )}
                  {(reportClass === '8A' || reportClass === '8B' || reportClass === '9A' || reportClass === '9B') && (
                    <option value="Koding">Koding</option>
                  )}
                </select>
              </div>

              {reportPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Dari Tanggal</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border text-xs rounded-xl" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Sampai Tanggal</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border text-xs rounded-xl" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  const rows = students.map((s, idx) => [
                    idx + 1, 
                    s.name, 
                    attendance[s.id] || 'Hadir', 
                    grades[s.id] || '-'
                  ]);
                  handleOpenPrintPreview(
                    `REKAPITULASI PRESENSI & NILAI SISWA (${reportPeriod.toUpperCase()})`,
                    `SMPN 1 Damai  |  Kelas: ${reportClass}  |  Mata Pelajaran: ${reportSubject}`,
                    rows
                  );
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Laporan & TTD</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm border-b pb-2">Profil & TTD Digital Permanen</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Nama Lengkap Guru</label>
                <input 
                  type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  placeholder="Masukkan Nama Lengkap & Gelar..."
                  value={profile.full_name || ''} 
                  onChange={e => setProfile({...profile, full_name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">NIP Guru</label>
                <input 
                  type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  placeholder="Masukkan NIP Kamu..."
                  value={profile.nip || ''} 
                  onChange={e => setProfile({...profile, nip: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Upload File Gambar TTD (PNG/JPG)</label>
                <input 
                  type="file" accept="image/*" 
                  onChange={handleSignatureUpload} 
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600" 
                />
                {profile.signature_url && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">Preview TTD Tersimpan:</p>
                    <img src={profile.signature_url} alt="TTD Guru" className="h-16 mx-auto object-contain" />
                  </div>
                )}
              </div>

              <button 
                onClick={handleSaveProfile} disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-xs shadow transition-all"
              >
                {loading ? 'Menyimpan...' : 'Simpan Profil Permanen ke Database'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Floating Footer Navigation (no-print) */}
      <div className="no-print fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 z-30 rounded-t-2xl shadow-lg">
        <button onClick={() => setActiveTab('input')} className={`p-2 flex flex-col items-center ${activeTab === 'input' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1">Jurnal</span>
        </button>
        <button onClick={() => setActiveTab('edit')} className={`p-2 flex flex-col items-center ${activeTab === 'edit' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400'}`}>
          <Edit3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Review</span>
        </button>
        <button onClick={() => setActiveTab('siswa')} className={`p-2 flex flex-col items-center ${activeTab === 'siswa' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-1">Siswa</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`p-2 flex flex-col items-center ${activeTab === 'profile' ? 'text-blue-600 font-bold scale-105' : 'text-slate-400'}`}>
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] mt-1">Profil</span>
        </button>
      </div>

      {/* MODAL PREVIEW DOKUMEN LAPORAN & CETAK SAVE AS PDF */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between p-2 overflow-y-auto">
          {/* Header Action Modal */}
          <div className="no-print bg-white p-3 rounded-2xl flex justify-between items-center shadow-lg mb-2 sticky top-0 z-10">
            <button 
              onClick={() => setShowPreviewModal(false)}
              className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>

            <button 
              onClick={handleTriggerPrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Save as PDF</span>
            </button>
          </div>

          {/* Area Dokumen Resmi (Dicetak) */}
          <div className="bg-white p-4 rounded-xl text-slate-900 font-sans shadow-2xl mx-auto w-full max-w-xl text-[9pt] leading-tight">
            {/* Kop Surat */}
            <div className="text-center mb-1">
              <h3 className="font-bold text-[10.5pt] uppercase p-0 m-0">PEMERINTAH KABUPATEN KUTAI BARAT</h3>
              <h3 className="font-bold text-[11.5pt] uppercase p-0 m-0">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
              <h2 className="font-black text-[13.5pt] text-blue-900 uppercase p-0 m-0">SMP NEGERI 1 DAMAI</h2>
              <p className="text-[7.5pt] italic text-slate-500 m-0">Jl. Poros Damai, Kecamatan Damai, Kabupaten Kutai Barat, Kalimantan Timur</p>
            </div>
            
            <div className="border-t-2 border-black border-b-[0.8px] border-b-black h-[2px] my-2"></div>

            {/* Judul Laporan */}
            <div className="text-center mb-3">
              <h4 className="font-bold text-[10pt] uppercase">{previewData.title}</h4>
              {previewData.subtitle && <p className="text-[8pt] text-slate-600">{previewData.subtitle}</p>}
            </div>

            {/* Tabel Data Siswa */}
            <table className="w-full border-collapse border border-slate-400 text-[8pt]">
              <thead>
                <tr className="bg-blue-600 text-white font-bold text-center">
                  <th className="border border-slate-400 p-1 w-10">NO</th>
                  <th className="border border-slate-400 p-1 text-left">NAMA LENGKAP SISWA</th>
                  <th className="border border-slate-400 p-1 w-28">STATUS PRESENSI</th>
                  <th className="border border-slate-400 p-1 w-20">NILAI</th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="border border-slate-300 p-1 text-center font-medium">{row[0]}</td>
                    <td className="border border-slate-300 p-1 font-bold">{row[1]}</td>
                    <td className={`border border-slate-300 p-1 text-center font-bold ${row[2] === 'Hadir' ? 'text-emerald-700' : 'text-red-600'}`}>{row[2]}</td>
                    <td className="border border-slate-300 p-1 text-center font-medium">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Area TTD Guru */}
            <div className="mt-4 flex justify-end">
              <div className="w-48 text-left text-[8.5pt]">
                <p>Damai, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-normal mb-1">Guru Mata Pelajaran,</p>
                
                <div className="h-12 my-1 flex items-center justify-start">
                  {previewData.signatureUrl ? (
                    <img src={previewData.signatureUrl} alt="TTD Guru" className="max-h-12 max-w-[150px] object-contain" />
                  ) : (
                    <div className="h-10 border-b border-dashed border-slate-300 w-full flex items-center text-[7pt] text-slate-400">(Belum ada foto TTD)</div>
                  )}
                </div>

                <p className="font-bold underline text-[9pt]">{previewData.teacherName}</p>
                <p className="text-[8pt] text-slate-600">NIP. {previewData.teacherNip}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
