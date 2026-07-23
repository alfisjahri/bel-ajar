import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { compressAndUpload } from './utils/compressor';
import { generatePDFReport } from './utils/pdfGenerator';
import { BookOpen, Calendar, Search, FileText, LogIn, LogOut, Camera, Check, Edit3 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Config Guru (Untuk PDF - tidak di-push ke GitHub)
  const [teacherName, setTeacherName] = useState(localStorage.getItem('teacherName') || '');
  const [teacherNip, setTeacherNip] = useState(localStorage.getItem('teacherNip') || '');
  const [signatureImg, setSignatureImg] = useState(localStorage.getItem('teacherSig') || '');

  // State Form Jurnal
  const [selectedClass, setSelectedClass] = useState('7');
  const [selectedSubject, setSelectedSubject] = useState('Matematika');
  const [material, setMaterial] = useState('');
  const [photos, setPhotos] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    // Standard Siswa Default Dummy
    const mockStudents = [
      { id: '1', name: 'Ahmad Rizky', nis: '1001' },
      { id: '2', name: 'Biti Rahma', nis: '1002' },
      { id: '3', name: 'Citra Dewi', nis: '1003' }
    ];
    setStudents(mockStudents);

    // Default Kehadiran = Hadir
    const initAtt = {};
    mockStudents.forEach(s => initAtt[s.id] = 'Hadir');
    setAttendance(initAtt);
  }, [selectedClass]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login Gagal: ' + error.message);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImg(reader.result);
        localStorage.setItem('teacherSig', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitJurnal = async () => {
    if (isDemo) return alert('Mode Demo: Data tidak tersimpan ke Database.');
    setLoading(true);

    let photoUrls = [];
    if (photos.length > 0) {
      photoUrls = await compressAndUpload(photos, supabase);
    }

    const { data: journal, error } = await supabase.from('journals').insert([
      { class_name: selectedClass, subject: selectedSubject, material, photos: photoUrls }
    ]).select().single();

    if (!error && journal) {
      const attRecords = Object.keys(attendance).map(sId => ({
        journal_id: journal.id, student_id: sId, status: attendance[sId]
      }));
      const gradeRecords = Object.keys(grades).map(sId => ({
        journal_id: journal.id, student_id: sId, score: grades[sId]
      }));

      await supabase.from('attendance').insert(attRecords);
      await supabase.from('grades').insert(gradeRecords);

      alert('Jurnal Berhasil Disimpan!');
      setMaterial('');
      setPhotos([]);
    }
    setLoading(false);
  };

  if (!session && !isDemo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-slate-800">Jurnal Mengajar Digital</h1>
            <p className="text-sm text-slate-500">SMP - Mobile First PWA</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" placeholder="Email / Username" 
              className="w-full p-3 border rounded-xl"
              value={email} onChange={e => setEmail(e.target.value)} required 
            />
            <input 
              type="password" placeholder="Password" 
              className="w-full p-3 border rounded-xl"
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow">
              Masuk
            </button>
          </form>
          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsDemo(true)} 
              className="text-sm text-slate-500 underline"
            >
              Masuk Mode Demo (Tanpa Login)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto relative border-x border-slate-200">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Jurnal Guru SMP</h2>
          <span className="text-xs bg-blue-700 px-2 py-0.5 rounded-full">
            {isDemo ? 'Mode Demo' : 'Mode Terhubung'}
          </span>
        </div>
        <button onClick={() => { supabase.auth.signOut(); setIsDemo(false); }} className="p-2">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'input' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Kelas</label>
                <select 
                  className="w-full p-2.5 bg-white border rounded-xl mt-1"
                  value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                >
                  {['7', '8A', '8B', '9A', '9B'].map(k => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Mata Pelajaran</label>
                <select 
                  className="w-full p-2.5 bg-white border rounded-xl mt-1"
                  value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="Matematika">Matematika</option>
                  <option value="Koding">Koding</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Materi Mengajar</label>
              <textarea 
                className="w-full p-3 bg-white border rounded-xl mt-1 h-24"
                placeholder="Tulis ringkasan materi..."
                value={material} onChange={e => setMaterial(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Foto Dokumentasi (Otomatis Kompres)</label>
              <input 
                type="file" multiple accept="image/*" capture="environment"
                onChange={e => setPhotos(Array.from(e.target.files))}
                className="w-full mt-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Presensi dan Nilai */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 text-sm">Presensi & Nilai Siswa</h3>
              {students.map(student => (
                <div key={student.id} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-400">NIS: {student.nis}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select 
                      value={attendance[student.id] || 'Hadir'}
                      onChange={e => setAttendance({...attendance, [student.id]: e.target.value})}
                      className="text-xs p-1.5 border rounded-lg bg-slate-50 font-medium"
                    >
                      <option value="Hadir">Hadir</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Izin">Izin</option>
                      <option value="Alfa">Alfa</option>
                    </select>
                    <input 
                      type="number" placeholder="Nilai" 
                      className="w-14 text-xs p-1.5 border rounded-lg text-center"
                      onChange={e => setGrades({...grades, [student.id]: e.target.value})}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSubmitJurnal} disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>{loading ? 'Memproses...' : 'Simpan Jurnal Hari Ini'}</span>
            </button>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white p-4 rounded-xl border space-y-4">
            <h3 className="font-bold text-slate-800 border-b pb-2">Pengaturan Identitas & TTD PDF</h3>
            <div>
              <label className="text-xs font-semibold text-slate-600">Nama Guru</label>
              <input 
                type="text" className="w-full p-2 border rounded-xl mt-1 text-sm"
                value={teacherName} onChange={e => { setTeacherName(e.target.value); localStorage.setItem('teacherName', e.target.value); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">NIP Guru</label>
              <input 
                type="text" className="w-full p-2 border rounded-xl mt-1 text-sm"
                value={teacherNip} onChange={e => { setTeacherNip(e.target.value); localStorage.setItem('teacherNip', e.target.value); }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">File Tanda Tangan (PNG Transparan)</label>
              <input type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full mt-1 text-sm" />
              {signatureImg && <img src={signatureImg} alt="TTD" className="h-16 mt-2 border p-1 rounded" />}
            </div>
            <button 
              onClick={() => {
                generatePDFReport({
                  title: `Rekap Presensi & Nilai Kelas ${selectedClass}`,
                  headers: ['NIS', 'Nama Siswa', 'Status Presensi', 'Nilai'],
                  rows: students.map(s => [s.nis, s.name, attendance[s.id] || 'Hadir', grades[s.id] || '-']),
                  teacherName, teacherNip, signatureBase64: signatureImg
                });
              }}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Test Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Bar Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around p-2 z-20">
        <button onClick={() => setActiveTab('input')} className={`p-2 flex flex-col items-center ${activeTab === 'input' ? 'text-blue-600' : 'text-slate-400'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Input Jurnal</span>
        </button>
        <button onClick={() => setActiveTab('config')} className={`p-2 flex flex-col items-center ${activeTab === 'config' ? 'text-blue-600' : 'text-slate-400'}`}>
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Laporan & TTD</span>
        </button>
      </div>
    </div>
  );
}
