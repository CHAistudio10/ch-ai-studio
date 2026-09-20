# CH AI Studio — REAL AI MVP

Versi ini sudah mempunyai backend Node.js dan endpoint `/api/generate`.
Generate Gambar benar-benar memanggil OpenAI API. OpenAI mendokumentasikan penggunaan
Responses API dengan `image_generation` tool untuk menghasilkan gambar dan mengembalikan
hasil gambar dalam Base64.

## Jalankan di komputer
1. Install Node.js.
2. Extract ZIP.
3. Buka terminal di folder ini.
4. Jalankan:
   npm install
5. Salin `.env.example` menjadi `.env`.
6. Isi `OPENAI_API_KEY`.
7. Jalankan:
   npm start
8. Buka:
   http://localhost:3000

## Keamanan
Jangan memasukkan API key ke `app.js` atau file frontend.
API key harus berada di `.env`/environment variable server.

## Deploy
Project ini cocok dideploy ke layanan yang menjalankan Node.js/serverless.
Set environment variable `OPENAI_API_KEY` di dashboard hosting.
Jangan commit `.env` ke GitHub.

## Yang sudah nyata
- UI CH AI Studio
- Prompt
- Upload referensi gambar
- Generate gambar AI
- Hasil ditampilkan di browser
- Download hasil
- Kredit demo
- Asset/Project di localStorage

## Yang belum
- Login user sungguhan
- Database cloud
- Kredit server-side
- Pembayaran
- Video generation

Ini sengaja dibuat bertahap agar biaya dan kompleksitas tetap rendah.
