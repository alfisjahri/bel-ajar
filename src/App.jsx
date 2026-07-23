import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { compressAndUpload } from './utils/compressor';
import { generatePDFReport } from './utils/pdfGenerator';
import { 
  BookOpen, FileText, LogOut, Check, UserCheck, 
  Search, Edit3, Image as ImageIcon, Users, RefreshCw,
  UserPlus, Trash2, Edit, Save, X
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profil Guru Auto-Fetch
  const [profile, setProfile] = useState({ full_name: '', nip: '', signature_url: '' });

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

  // Management Siswa State (CRUD)
  const [allStudents, setAllStudents] = useState([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', class_name: '7' });
  const [editingStudent, setEditingStudent] = useState(null); // id siswa yang sedang diedit

  // History Jurnal
  const [journalsHistory, setJournalsHistory] = useState([]);

  // 🔥 1. MAPEL OTOMATIS BERDASARKAN KELAS
  useEffect(() => {
    if (selectedClass === '7') {
      setSelectedSubject('Matematika');
    } else if (selectedClass === '9A' || selectedClass === '9B') {
      setSelectedSubject('Koding');
    } else {
      // Kelas 8A dan 8B default Matematika jika tidak diset
      if (selectedSubject !== 'Matematika' && selectedSubject !== 'Koding') {
        setSelectedSubject('Matematika');
      }
    }
  }, [selectedClass]);

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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  // Fetch Siswa per Kelas untuk Jurnal
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

  // 🔥 Fetch Semua Siswa untuk Management Tab "Siswa"
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

    const { data, error } = await supabase.from('students').insert([
      { name: newStudent.name.toUpperCase(), class_name: newStudent.class_name }
    ]).select();

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
            <p className="text-xs text-slate-500 font-medium mt-1">Jurnal Mengajar Digital SMP</p>
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
      
      {/* Top Mobile Bar */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-30 shadow-md rounded-b-2xl flex justify-between items-center">
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
      <div className="p-4 space-y-4">

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

                {/* 🔥 DINAMIS PENGATURAN MAPEL */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-75"
                    value={selectedSubject} 
                    onChange={e => setSelectedSubject(e.target.value)}
                    disabled={selectedClass === '7' || selectedClass === '9A' || selectedClass === '9B'}
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

        {/* 🔥 TAB 3: MANAGEMENT SISWA (CRUD LENGKAP) */}
        {activeTab === 'siswa' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Kelola Data Siswa</h3>
                <button 
                  onClick={() => setIsAddingStudent(!isAddingStudent)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
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
                  type="text" placeholder="Cari nama atau kelas..." 
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  value={searchStudentQuery} onChange={e => setSearchStudentQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List Siswa */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold px-1">Total Siswa: {filteredAllStudents.length}</p>
              {filteredAllStudents.map(student => (
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
                        <button onClick={() => setEditingStudent(student)} className="p-1.5 text-slate-500 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteStudent(student.id, student.name)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PROFIL GURU & PDF */}
        {activeTab === 'profile' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b pb-2">Profil & TTD Digital</h3>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Nama Guru</label>
              <input 
                type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                value={profile.full_name || ''} 
                onChange={e => setProfile({...profile, full_name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">NIP</label>
              <input 
                type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                value={profile.nip || ''} 
                onChange={e => setProfile({...profile, nip: e.target.value})}
              />
            </div>
            <button 
              onClick={() => {
                generatePDFReport({
                  title: `Laporan Bel Ajar - Kelas ${selectedClass}`,
                  headers: ['No', 'Nama Siswa', 'Status', 'Nilai'],
                  rows: students.map((s, idx) => [idx + 1, s.name, attendance[s.id] || 'Hadir', grades[s.id] || '-']),
                  teacherName: profile.full_name,
                  teacherNip: profile.nip,
                  signatureBase64: profile.signature_url
                });
              }}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak PDF Laporan Bel Ajar</span>
            </button>
          </div>
        )}

      </div>

      {/* Floating Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 z-30 rounded-t-2xl shadow-lg">
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

    </div>
  );
}
