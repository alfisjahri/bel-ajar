import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { compressAndUpload } from './utils/compressor';
import { 
  BookOpen, FileText, LogOut, Check, UserCheck, 
  Search, Edit3, Image as ImageIcon, Users, RefreshCw,
  Plus, Trash, Edit, Save, X, Download, Eye, Printer, 
  ChevronDown, ChevronUp, Settings, Calendar, ShieldAlert, CheckCircle, AlertTriangle
} from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  
  // Custom Alert Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // Auth & Lockout State (Max 3x Coba)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(() => parseInt(localStorage.getItem('login_attempts') || '0'));
  const [lockoutUntil, setLockoutUntil] = useState(() => localStorage.getItem('lockout_until') || null);

  // Profil Guru
  const [profile, setProfile] = useState({ 
    full_name: localStorage.getItem('teacher_name') || '', 
    nip: localStorage.getItem('teacher_nip') || '', 
    signature_url: localStorage.getItem('teacher_sig') || '' 
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Form State Jurnal
  const [journalDate, setStartDateJournal] = useState(new Date().toISOString().split('T')[0]); // Default Hari Ini
  const [selectedClass, setSelectedClass] = useState('7');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [material, setMaterial] = useState('');
  const [photos, setPhotos] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  // Filter Rekap Laporan
  const [reportPeriod, setReportPeriod] = useState('bulanan');
  const [reportClass, setReportClass] = useState('7');
  const [reportSubject, setReportSubject] = useState('Matematika');
  const [startDate, setStartDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modal Print Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Management Siswa
  const [allStudents, setAllStudents] = useState([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', class_name: '7' });
  const [editingStudent, setEditingStudent] = useState(null);

  // History Jurnal (Tab Review)
  const [journalsHistory, setJournalsHistory] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // LOGIKA MAPEL KETAT
  useEffect(() => {
    if (selectedClass === '7') setSelectedSubject('Matematika');
    else if (selectedClass === '9A' || selectedClass === '9B') setSelectedSubject('Koding');
    else if (selectedClass === '8A' || selectedClass === '8B') {
      if (selectedSubject !== 'Matematika' && selectedSubject !== 'Koding') setSelectedSubject('Matematika');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (reportClass === '7') setReportSubject('Matematika');
    else if (reportClass === '9A' || reportClass === '9B') setReportSubject('Koding');
    else if (reportClass === '8A' || reportClass === '8B') {
      if (reportSubject !== 'Matematika' && reportSubject !== 'Koding') setReportSubject('Matematika');
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

  // Fetch Riwayat Jurnal untuk Tab Review
  const fetchJournalsHistory = async () => {
    if (isDemo) return;
    setFetchingHistory(true);
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJournalsHistory(data);
    }
    setFetchingHistory(false);
  };

  useEffect(() => {
    if (activeTab === 'edit') fetchJournalsHistory();
    if (activeTab === 'siswa') fetchAllStudents();
  }, [activeTab]);

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
    if (!session) return showToast('Kamu harus login terlebih dahulu!', 'error');
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
      showToast('Profil & NIP tersimpan permanen!');
    } else {
      showToast('Gagal menyimpan profil: ' + error.message, 'error');
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
      showToast('Gambar TTD dimuat! Klik Simpan Profil di bawah.');
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
        { id: '2', name: 'AFIFATUL AZIZAH', class_name: className },
        { id: '3', name: 'AGRIFINA TRIZIA', class_name: className }
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

  // CRUD SISWA
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;

    const { error } = await supabase.from('students').insert([
      { name: newStudent.name.toUpperCase(), class_name: newStudent.class_name }
    ]);

    if (!error) {
      showToast('Siswa berhasil ditambahkan!');
      setNewStudent({ name: '', class_name: '7' });
      setIsAddingStudent(false);
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      showToast('Gagal menambah siswa: ' + error.message, 'error');
    }
  };

  const handleUpdateStudent = async (id) => {
    const { error } = await supabase.from('students').update({
      name: editingStudent.name.toUpperCase(),
      class_name: editingStudent.class_name
    }).eq('id', id);

    if (!error) {
      showToast('Data siswa diperbarui!');
      setEditingStudent(null);
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      showToast('Gagal memperbarui siswa', 'error');
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus siswa ${name}?`)) return;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      showToast('Siswa terhapus!');
      fetchAllStudents();
      fetchStudentsByClass(selectedClass);
    } else {
      showToast('Gagal menghapus siswa', 'error');
    }
  };

  const initAttendance = (studentList) => {
    const att = {};
    studentList.forEach(s => att[s.id] = 'Hadir');
    setAttendance(att);
  };

  // SIMPAN JURNAL
  const handleSubmitJurnal = async () => {
    if (isDemo) return showToast('Mode Demo: Data tidak tersimpan.', 'error');
    if (!material.trim()) return showToast('Isi materi pembelajaran terlebih dahulu!', 'error');

    setLoading(true);
    let photoUrls = [];
    if (photos.length > 0) {
      photoUrls = await compressAndUpload(photos, supabase);
    }

    const customEntryDate = new Date(journalDate);

    const { data: journal, error } = await supabase.from('journals').insert([
      { 
        class_name: selectedClass, 
        subject: selectedSubject, 
        material, 
        photos: photoUrls,
        created_at: customEntryDate 
      }
    ]).select().single();

    if (!error && journal) {
      const attRecords = students.map(s => ({
        journal_id: journal.id, student_id: s.id, status: attendance[s.id] || 'Hadir', date: customEntryDate
      }));
      const gradeRecords = students.filter(s => grades[s.id]).map(s => ({
        journal_id: journal.id, student_id: s.id, score: parseFloat(grades[s.id]), date: customEntryDate
      }));

      await supabase.from('attendance').insert(attRecords);
      if (gradeRecords.length > 0) await supabase.from('grades').insert(gradeRecords);

      showToast('✅ Jurnal Bel Ajar Berhasil Disimpan!');
      setMaterial('');
      setPhotos([]);
      setGrades({});
      initAttendance(students);
    } else {
      showToast('Gagal menyimpan jurnal: ' + error?.message, 'error');
    }
    setLoading(false);
  };

  // CETAK INDIVIDUAL SISWA (REKAP PRESENSI H/S/I/A)
  const handleExportIndividualPDF = async (student) => {
    let studentAtt = [];
    if (!isDemo) {
      const { data } = await supabase
        .from('attendance')
        .select('status, date, notes')
        .eq('student_id', student.id)
        .order('date', { ascending: false });
      if (data) studentAtt = data;
    }

    // Hitung Total H / S / I / A
    const summary = { H: 0, S: 0, I: 0, A: 0 };
    studentAtt.forEach(a => {
      if (a.status === 'Hadir') summary.H++;
      else if (a.status === 'Sakit') summary.S++;
      else if (a.status === 'Izin') summary.I++;
      else if (a.status === 'Alfa') summary.A++;
    });

    const rows = studentAtt.map((a, idx) => [
      idx + 1,
      new Date(a.date).toLocaleDateString('id-ID'),
      a.status,
      a.notes || '-'
    ]);

    setPreviewData({
      title: `REKAP PRESENSI INDIVIDUAL SISWA`,
      subtitle: `Nama: ${student.name} | Kelas: ${student.class_name}`,
      subjectRole: `Guru Mata Pelajaran Kelas ${student.class_name}`,
      isIndividual: true,
      summary, // Data H/S/I/A
      rows: rows.length > 0 ? rows : [],
      teacherName: profile.full_name || 'NUR ALFI SYAHRI, S.P.',
      teacherNip: profile.nip || '-------------------',
      signatureUrl: profile.signature_url
    });
    setShowPreviewModal(true);
  };

  // PREPARE PREVIEW CETAK REKAP KELAS
  const handleOpenPrintPreview = (title, subtitle, subjectName, rows) => {
    setPreviewData({
      title,
      subtitle,
      subjectRole: `Guru Mata Pelajaran ${subjectName}`,
      isIndividual: false,
      rows,
      teacherName: profile.full_name || 'NUR ALFI SYAHRI, S.P.',
      teacherNip: profile.nip || '-------------------',
      signatureUrl: profile.signature_url
    });
    setShowPreviewModal(true);
  };

  // LOGIN DENGAN PROTEKSI MAX 3 KALI LOCKOUT 24 JAM
  const handleLogin = async (e) => {
    e.preventDefault();

    // Cek Lockout
    if (lockoutUntil) {
      const lockTime = new Date(lockoutUntil).getTime();
      const now = new Date().getTime();
      if (now < lockTime) {
        const remainingHours = Math.ceil((lockTime - now) / (1000 * 60 * 60));
        return showToast(`Akses diblokir! Terlalu banyak percobaan. Coba lagi dalam ${remainingHours} jam.`, 'error');
      } else {
        localStorage.removeItem('lockout_until');
        localStorage.setItem('login_attempts', '0');
        setLockoutUntil(null);
        setLoginAttempts(0);
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('login_attempts', newAttempts.toString());

      if (newAttempts >= 3) {
        const lockoutTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem('lockout_until', lockoutTime);
        setLockoutUntil(lockoutTime);
        showToast('❌ Login gagal 3x! Device diblokir selama 24 jam.', 'error');
      } else {
        showToast(`Login Gagal! Sisa percobaan: ${3 - newAttempts}x`, 'error');
      }
    } else {
      localStorage.removeItem('login_attempts');
      setLoginAttempts(0);
      showToast('Berhasil Login!');
    }
  };

  if (!session && !isDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-700 to-indigo-900 flex items-center justify-center p-4 font-sans">
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

            {loginAttempts > 0 && loginAttempts < 3 && (
              <p className="text-[11px] text-amber-600 font-bold text-center">⚠️ Sisa percobaan login: {3 - loginAttempts}x</p>
            )}

            <button 
              type="submit" 
              disabled={!!lockoutUntil}
              className={`w-full text-white py-3.5 rounded-xl font-bold shadow-lg transition-all ${
                lockoutUntil ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
              }`}
            >
              {lockoutUntil ? 'Akses Diblokir (24 Jam)' : 'Masuk Aplikasi'}
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
      
      {/* FLOATING CUSTOM TOAST ALERT */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold transition-all animate-bounce ${
          toast.type === 'error' ? 'bg-red-500 text-white border-red-600' : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-amber-300" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Mobile Bar */}
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

      {/* Main Content */}
      <div className="no-print p-4 space-y-4">

        {/* TAB 1: INPUT JURNAL */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              
              {/* OPSI TANGGAL JURNAL (DEFAULT HARI INI) */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tanggal Mengajar</label>
                <input 
                  type="date" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  value={journalDate} 
                  onChange={e => setStartDateJournal(e.target.value)}
                />
              </div>

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

              {/* UPLOAD FOTO BEBAS (DARI GALERI/KAMERA) */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Foto Dokumentasi (Galeri / Kamera)</label>
                <input 
                  type="file" multiple accept="image/*"
                  onChange={e => setPhotos(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600"
                />
              </div>
            </div>

            {/* PRESENSI RADIO BUTTON CARD (H / S / I / A) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-slate-800 text-xs">Presensi Siswa Kelas {selectedClass} ({students.length})</h3>
                </div>
                {fetchingStudents && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              </div>

              {students.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-6">Tidak ada data siswa untuk Kelas {selectedClass}</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {students.map((student, idx) => (
                    <div key={student.id} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                      <p className="font-extrabold text-xs text-slate-800">{idx + 1}. {student.name}</p>

                      <div className="p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3.5">
                          {[
                            { code: 'Hadir', label: 'H', color: 'text-emerald-600' },
                            { code: 'Sakit', label: 'S', color: 'text-amber-600' },
                            { code: 'Izin', label: 'I', color: 'text-blue-600' },
                            { code: 'Alfa', label: 'A', color: 'text-red-600' },
                          ].map(item => (
                            <label key={item.code} className="flex flex-col items-center cursor-pointer select-none">
                              <span className={`text-[11px] font-black ${item.color} mb-1`}>{item.label}</span>
                              <input 
                                type="radio" 
                                name={`att-${student.id}`} 
                                value={item.code}
                                checked={(attendance[student.id] || 'Hadir') === item.code}
                                onChange={() => setAttendance({ ...attendance, [student.id]: item.code })}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
                            </label>
                          ))}
                        </div>

                        <div className="border-l border-slate-200 pl-3 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">NILAI</span>
                          <input 
                            type="number" 
                            placeholder="-" 
                            className="w-12 text-xs p-1 border border-slate-200 rounded-lg text-center font-bold bg-white focus:ring-1 focus:ring-blue-500"
                            value={grades[student.id] || ''}
                            onChange={e => setGrades({...grades, [student.id]: e.target.value})}
                          />
                        </div>
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

        {/* TAB 2: REVIEW JURNAL (MUNCULKAN HISTORY REAL) */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-xs">Riwayat Jurnal Mengajar Bel Ajar</h3>
              <button onClick={fetchJournalsHistory} className="text-blue-600 p-1"><RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} /></button>
            </div>

            {journalsHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12 bg-white rounded-2xl border">Belum ada jurnal tersimpan.</p>
            ) : (
              journalsHistory.map(j => (
                <div key={j.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md mr-1">Kelas {j.class_name}</span>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{j.subject}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(j.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">{j.material}</p>
                  
                  {j.photos && j.photos.length > 0 && (
                    <div className="flex gap-2 pt-1 overflow-x-auto">
                      {j.photos.map((url, i) => (
                        <img key={i} src={url} alt="Dokumentasi" className="w-14 h-14 object-cover rounded-xl border" />
                      ))}
                    </div>
                  )}
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

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" placeholder="Ketik nama atau kelas siswa..." 
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  value={searchStudentQuery} onChange={e => setSearchStudentQuery(e.target.value)}
                />
              </div>
            </div>

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
                            onClick={() => handleExportIndividualPDF(student)} 
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
                    <input type="date" className="w-full p-2 bg-slate-50 border text-xs rounded-xl" value={startDate} onChange={e => setStartDateFilter(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Sampai Tanggal</label>
                    <input type="date" className="w-full p-2 bg-slate-50 border text-xs rounded-xl" value={endDate} onChange={e => setEndDateFilter(e.target.value)} />
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
                    reportSubject,
                    rows
                  );
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Laporan & TTD</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full p-4 flex justify-between items-center bg-slate-50/80 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-slate-800 text-xs">Profil & TTD Digital Permanen</h3>
                </div>
                {isProfileOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {isProfileOpen && (
                <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
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
              )}
            </div>
          </div>
        )}

      </div>

      {/* Floating Footer Navigation */}
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
          <div className="no-print bg-white p-3 rounded-2xl flex justify-between items-center shadow-lg mb-3 sticky top-0 z-10 max-w-xl mx-auto w-full">
            <button 
              onClick={() => setShowPreviewModal(false)}
              className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>

            <button 
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Save as PDF</span>
            </button>
          </div>

          <div className="print-document bg-white p-6 rounded-xl text-slate-900 font-serif shadow-2xl mx-auto w-full max-w-xl text-[9.5pt] leading-tight">
            
            {/* KOP SURAT */}
            <div className="flex items-center justify-between gap-3 mb-1">
              <img 
                src="/logo-kubar.png" 
                alt="Logo Pemkab Kutai Barat" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/23/Coat_of_arms_of_West_Kutai_Regency.png'; }}
                className="w-16 h-20 object-contain"
              />

              <div className="text-center flex-1">
                <h3 className="font-bold text-[11pt] uppercase tracking-wide m-0 p-0">PEMERINTAH KABUPATEN KUTAI BARAT</h3>
                <h3 className="font-bold text-[12pt] uppercase tracking-wide m-0 p-0">DINAS PENDIDIKAN DAN KEBUDAYAAN</h3>
                <h2 className="font-black text-[14pt] uppercase tracking-wider m-0 p-0">SMP NEGERI 1 DAMAI</h2>
                <p className="font-bold text-[8.5pt] m-0 p-0 mt-0.5">
                  <u>NSS : 20.1.16.09.08.001</u> &nbsp;&nbsp; <u>NPSN : 30400615</u> &nbsp;&nbsp; <u>NIS : 200070</u>
                </p>
                <p className="text-[8pt] m-0 p-0 italic">
                  Jalan Temanggung Gamas RT.1 No.27 Damai Kota - Kode Pos 75777
                </p>
              </div>

              <img 
                src="/logo-smp.png" 
                alt="Logo SMPN 1 Damai" 
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                className="w-16 h-20 object-contain"
              />
            </div>

            <div className="border-t-[2.5px] border-black border-b-[0.8px] border-b-black h-[2px] my-2"></div>

            <div className="text-center my-3">
              <h4 className="font-bold text-[11pt] uppercase underline">{previewData.title}</h4>
              {previewData.subtitle && <p className="text-[9pt] text-slate-700 font-sans mt-0.5">{previewData.subtitle}</p>}
            </div>

            {/* RINGKASAN H/S/I/A APABILA LAPORAN INDIVIDUAL SISWA */}
            {previewData.isIndividual && previewData.summary && (
              <div className="mb-3 font-sans text-[8.5pt] bg-slate-50 p-2 rounded-lg border border-slate-300 flex justify-around font-bold">
                <span className="text-emerald-700">Hadir (H): {previewData.summary.H}</span>
                <span className="text-amber-700">Sakit (S): {previewData.summary.S}</span>
                <span className="text-blue-700">Izin (I): {previewData.summary.I}</span>
                <span className="text-red-700">Alfa (A): {previewData.summary.A}</span>
              </div>
            )}

            {/* TABEL DATA SISWA */}
            <table className="w-full border-collapse border border-slate-900 text-[8.5pt] font-sans">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                  <th className="border border-slate-900 p-1 w-10">NO</th>
                  <th className="border border-slate-900 p-1 text-left">{previewData.isIndividual ? 'TANGGAL' : 'NAMA LENGKAP SISWA'}</th>
                  <th className="border border-slate-900 p-1 w-28">STATUS PRESENSI</th>
                  <th className="border border-slate-900 p-1 w-20">{previewData.isIndividual ? 'CATATAN' : 'NILAI'}</th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="border border-slate-800 p-3 text-center text-slate-400 italic">Belum ada riwayat data presensi.</td>
                  </tr>
                ) : (
                  previewData.rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="border border-slate-800 p-1 text-center font-medium">{row[0]}</td>
                      <td className="border border-slate-800 p-1 font-bold">{row[1]}</td>
                      <td className={`border border-slate-800 p-1 text-center font-bold ${row[2] === 'Hadir' ? 'text-emerald-700' : 'text-red-600'}`}>{row[2]}</td>
                      <td className="border border-slate-800 p-1 text-center font-medium">{row[3]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* AREA TTD GURU */}
            <div className="mt-5 flex justify-end font-sans">
              <div className="w-56 text-left text-[9pt]">
                <p>Damai, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-normal mb-1">{previewData.subjectRole},</p>
                
                <div className="h-14 my-1 flex items-center justify-start">
                  {previewData.signatureUrl ? (
                    <img src={previewData.signatureUrl} alt="TTD Guru" className="max-h-14 max-w-[160px] object-contain" />
                  ) : (
                    <div className="h-10 border-b border-dashed border-slate-300 w-full flex items-center text-[7pt] text-slate-400">(Belum ada foto TTD)</div>
                  )}
                </div>

                <p className="font-bold underline text-[9.5pt]">{previewData.teacherName}</p>
                <p className="text-[8.5pt] text-slate-600">NIP. {previewData.teacherNip}</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
