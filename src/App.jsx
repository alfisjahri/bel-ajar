// Auto-Fetch Profile saat Login
const fetchProfile = async (userId) => {
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Jika profil belum ada, buat row baru otomatis untuk user ini
      const newProfile = { id: userId, full_name: 'NUR ALFI SYAHRI, S.P.', nip: '', signature_url: '' };
      await supabase.from('profiles').insert([newProfile]);
      setProfile(newProfile);
    }
  } catch (err) {
    console.error('Gagal fetch profil:', err);
  }
};

// Simpan Profil ke Database Supabase (Permanen)
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

  const { error } = await supabase.from('profiles').upsert(updates);
  setLoading(false);

  if (!error) {
    alert('✅ Profil, NIP, & TTD tersimpan PERMANEN di Supabase!');
  } else {
    alert('Gagal menyimpan: ' + error.message);
  }
};
