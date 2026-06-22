const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const videoPath = path.join(rootDir, 'assets', 'home-hero-bg.mp4');
const outputDir = path.join(rootDir, 'marinmc-client-mod', 'src', 'main', 'resources', 'assets', 'marinmc-client', 'textures', 'gui', 'bg_frames');

console.log('--- Video Frame Extractor ---');
console.log('Video Path:', videoPath);
console.log('Output Dir:', outputDir);

if (!fs.existsSync(videoPath)) {
  console.error('\n❌ HATA: assets/home-hero-bg.mp4 bulunamadı!');
  console.log('Lütfen videonuzu "assets/home-hero-bg.mp4" konumuna kaydettikten sonra bu scripti çalıştırın.');
  process.exit(1);
}

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Check if ffmpeg is installed
exec('ffmpeg -version', (err) => {
  if (err) {
    console.error('\n❌ HATA: Sisteminizde FFMPEG bulunamadı!');
    console.log('Video frame extraction işlemi için FFMPEG yüklü olmalıdır.');
    console.log('Windows için: "winget install Gyan.FFmpeg" komutuyla yükleyebilirsiniz.');
    process.exit(1);
  }

  console.log('\nFFMPEG algılandı. Dönüştürme başlatılıyor...');
  console.log('15 FPS, 854x480 çözünürlüğe ayarlanıyor (optimum boyut/performans için)...');

  // Empty existing frames if any
  const existingFiles = fs.readdirSync(outputDir);
  for (const file of existingFiles) {
    if (file.startsWith('frame_') && file.endsWith('.png')) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  }

  // FFMPEG command to extract frames
  // %d format: frame_1.png, frame_2.png...
  const cmd = `ffmpeg -i "${videoPath}" -vf "fps=15,scale=854:480" "${path.join(outputDir, 'frame_%d.png')}"`;

  exec(cmd, (execErr, stdout, stderr) => {
    if (execErr) {
      console.error('❌ Kare çıkartma başarısız oldu:', execErr);
      process.exit(1);
    }

    const createdFiles = fs.readdirSync(outputDir).filter(f => f.startsWith('frame_') && f.endsWith('.png'));
    console.log(`\n✅ BAŞARILI: ${createdFiles.length} adet kare başarıyla çıkartıldı!`);
    console.log(`Konum: ${outputDir}`);
    console.log(`Mod artık bu kareleri döngüsel olarak oynatabilecektir.`);
  });
});
