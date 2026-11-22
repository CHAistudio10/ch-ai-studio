import fs from 'fs';

const indexPath = 'public/index.html';
const backupPath = 'public/index.html.backup-before-culinary';

// 1. Backup public/index.html
fs.copyFileSync(indexPath, backupPath);
let html = fs.readFileSync(indexPath, 'utf8');

// 2. Perbarui subtitle kartu di halaman depan
html = html.replace(
  /<small>5–10 Foto ke Video Promosi TikTok • Beat Sync &amp; Storyboard AI<\/small>/,
  '<small>Promosi Restoran &amp; Kuliner • Tag Lokasi Maps &amp; Promo TikTok</small>'
);

// 3. Ganti isi <section id="page-affiliate-tiktok" class="page">...</section>
const sectionRegex = /<section id="page-affiliate-tiktok" class="page">[\s\S]*?<\/section>/;
const newSection = `<section id="page-affiliate-tiktok" class="page">
      <div class="v6-subpage-bar">
        <div class="v6-back-title">
          <button type="button" class="v6-back-btn" onclick="go('home')">←</button>
          <h2>CH AI AFFILIATE TIKTOK GO</h2>
        </div>
      </div>
      <div id="ch-ai-tiktok-go-container"></div>
    </section>`;

if (!sectionRegex.test(html)) {
  throw new Error('Section #page-affiliate-tiktok tidak ditemukan!');
}
html = html.replace(sectionRegex, newSection);

// 4. Ganti skrip lama di bagian bawah dengan module baru
const oldScriptTag = '<script src="affiliate-tiktok/tiktok-go.js?v=2"></script>';
const newModuleScript = `<script type="module">
    import { initTikTokGoModule } from '/modules/tiktok-go/tiktok-go-ui.js';
    initTikTokGoModule('ch-ai-tiktok-go-container');
  </script>`;

if (html.includes(oldScriptTag)) {
  html = html.replace(oldScriptTag, newModuleScript);
} else {
  html = html.replace('</body>', `${newModuleScript}\n</body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('✓ Backup disimpan di:', backupPath);
console.log('✓ public/index.html berhasil diperbarui ke CH AI AFFILIATE TIKTOK GO (Culinary & Maps)!');
