import imageCompression from 'browser-image-compression';

export async function compressAndUpload(files, supabaseClient) {
  const uploadedUrls = [];
  
  const options = {
    maxSizeMB: 0.3, // Maksimal 300KB per foto
    maxWidthOrHeight: 1280,
    useWebWorker: true
  };

  for (const file of files) {
    try {
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabaseClient.storage
        .from('journal-photos')
        .upload(fileName, compressedFile);

      if (!error) {
        const { data: publicUrlData } = supabaseClient.storage
          .from('journal-photos')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    } catch (err) {
      console.error('Gagal kompres/upload foto:', err);
    }
  }

  return uploadedUrls;
}
