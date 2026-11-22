// Adapter Gemini terisolasi yang menggunakan konfigurasi CH Chat AI (process.env.GEMINI_API_KEY)
const VALID_ANIMATIONS = ["zoom-in", "zoom-out", "pan-left", "pan-right", "vertical-pan", "cinematic-zoom"];
const VALID_TRANSITIONS = ["fade", "flash", "blur", "slide", "whip", "beat"];

async function getAvailableGeminiModels(apiKey) {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey)
    );
    const data = await res.json();
    if (res.ok && Array.isArray(data.models)) {
      const supported = data.models
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace(/^models\//, ""))
        .filter(name => name.includes("gemini") && !name.includes("embedding") && !name.includes("tts") && !name.includes("image-generation"));

      // Prioritaskan gemini-2.5-flash lalu gemini-2.0-flash
      const prioritized = [
        ...supported.filter(n => n.includes("2.5-flash") && !n.includes("lite")),
        ...supported.filter(n => n.includes("2.5-flash-lite")),
        ...supported.filter(n => n.includes("2.0-flash")),
        ...supported.filter(n => n.includes("2.5-pro"))
      ];
      if (prioritized.length > 0) return [...new Set(prioritized)];
    }
  } catch {}
  return ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
}

function extractJsonObject(rawText) {
  const cleaned = String(rawText || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Respons AI tidak mengandung JSON storyboard.");
  }
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function validateAndNormalizeStoryboard(raw, targetDuration, photoCount) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    throw new Error("Struktur storyboard dari AI tidak valid.");
  }

  const ctaType = raw.ctaType === "location" ? "location" : "product";
  const scenes = raw.scenes.slice(0, 5).map((sc, idx) => {
    const validPhotos = Array.isArray(sc.photoIndexes)
      ? sc.photoIndexes.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < photoCount)
      : [];
    return {
      scene: idx + 1,
      duration: Math.max(2, Number(sc.duration) || 4),
      photoIndexes: validPhotos.length > 0 ? validPhotos : [idx % photoCount],
      text: String(sc.text || "").trim().slice(0, 110) || "Cek selengkapnya sekarang!",
      animation: VALID_ANIMATIONS.includes(sc.animation) ? sc.animation : VALID_ANIMATIONS[idx % VALID_ANIMATIONS.length],
      transition: VALID_TRANSITIONS.includes(sc.transition) ? sc.transition : VALID_TRANSITIONS[idx % VALID_TRANSITIONS.length],
      textPosition: ["top", "center", "bottom"].includes(sc.textPosition) ? sc.textPosition : "center",
      textColor: /^#[0-9A-Fa-f]{6}$/.test(sc.textColor || "") ? sc.textColor : "#FFFFFF",
      fontSize: Math.min(84, Math.max(32, Number(sc.fontSize) || 54)),
      fontFamily: String(sc.fontFamily || "Sans")
    };
  });

  const totalCurrent = scenes.reduce((s, item) => s + item.duration, 0);
  if (totalCurrent > 0 && Math.abs(totalCurrent - targetDuration) > 0.1) {
    const ratio = targetDuration / totalCurrent;
    let acc = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (i === scenes.length - 1) {
        scenes[i].duration = Math.max(2, Number((targetDuration - acc).toFixed(1)));
      } else {
        const d = Math.max(2, Number((scenes[i].duration * ratio).toFixed(1)));
        scenes[i].duration = d;
        acc += d;
      }
    }
  }

  const defaultCTA = ctaType === "location"
    ? "CEK LOKASI & PROMONYA DI SINI!"
    : "KLIK PROMO TIKTOK PEMBELIAN DI SINI!";

  return {
    title: String(raw.title || "Video Promosi TikTok").slice(0, 80),
    duration: targetDuration,
    aspectRatio: "9:16",
    language: "id",
    ctaType,
    music: {
      beatSync: Boolean(raw.music?.beatSync),
      volume: Math.min(1, Math.max(0.1, Number(raw.music?.volume ?? 0.85)))
    },
    scenes,
    finalCTA: String(raw.finalCTA || defaultCTA).trim().slice(0, 80)
  };
}

export async function generateAffiliateStoryboard({ prompt, imagesBase64, duration, beatTimestamps = [], hasMusic = false }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi pada server.");
  }

  const instructionText = `Kamu adalah Creative Director video pendek TikTok Affiliate & Promosi (Indonesia) di dalam CH AI Studio.
Analisis ${imagesBase64.length} foto yang diunggah dan konsep prompt pengguna, lalu buat JSON storyboard adaptif untuk video vertikal 9:16 berdurasi TEPAT ${duration} detik.

ATURAN UTAMA:
1. PROMPT PENGGUNA ADALAH DASAR KONSEP. Jangan mengunci pada template kaku.
2. Buat 1 sampai 5 scene utama. Setiap scene bisa menggunakan 1 atau beberapa foto (photoIndexes: array indeks 0 sampai ${imagesBase64.length - 1}). Total durasi semua scene HARUS tepat ${duration} detik.
3. TEKS PROMOSI: Bahasa Indonesia alami, singkat (maks 8-10 kata per scene) agar jelas dibaca di layar HP, punya hook kuat di scene 1, dan kesinambungan cerita.
4. ANTI-HALUSINASI: DILARANG KERAS mengarang harga, diskon, stok, sertifikasi, kandungan, manfaat medis, atau fasilitas tempat yang tidak disebut di prompt dan tidak terlihat di foto.
5. CTA FRAME TERAKHIR:
   - Jika produk affiliate (ctaType: "product"): CTA pembelian TikTok (misal: "KLIK PROMO TIKTOK PEMBELIAN DI SINI!").
   - Jika restoran/hotel/wisata (ctaType: "location"): CTA cek tag lokasi atau penawaran TikTok, JANGAN sebut pembelian produk/keranjang.
6. VARIASI ANIMASI & TRANSISI:
   - animation: "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "vertical-pan" | "cinematic-zoom"
   - transition: "fade" | "flash" | "blur" | "slide" | "whip" | "beat"
7. BEAT SYNC: Ketukan musik terdeteksi pada detik [${beatTimestamps.join(", ")}].

BALAS HANYA DENGAN OBJEK JSON VALID TANPA TEKS TAMBAHAN:
{
  "title": "Judul konsep",
  "duration": ${duration},
  "aspectRatio": "9:16",
  "language": "id",
  "ctaType": "product",
  "music": { "beatSync": ${hasMusic}, "volume": 0.85 },
  "scenes": [
    {
      "scene": 1,
      "duration": 4,
      "photoIndexes": [0],
      "text": "Teks pembuka",
      "animation": "zoom-in",
      "transition": "flash",
      "textPosition": "center",
      "textColor": "#FFFFFF",
      "fontSize": 54,
      "fontFamily": "Sans"
    }
  ],
  "finalCTA": "KLIK PROMO TIKTOK PEMBELIAN DI SINI!"
}`;

  const parts = [
    { text: instructionText + "\n\nKonsep video dari pengguna: " + String(prompt) },
    ...imagesBase64.map(img => ({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.data
      }
    }))
  ];

  const models = await getAvailableGeminiModels(apiKey);
  let lastErr = null;

  for (const model of models) {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        lastErr = new Error(`[${model}] ` + (data?.error?.message || "HTTP " + resp.status));
        continue;
      }
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = extractJsonObject(rawText);
      return validateAndNormalizeStoryboard(parsed, duration, imagesBase64.length);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Gagal menghubungi Gemini dari CH Chat AI.");
}

export async function regenerateSingleSceneText({ prompt, currentSceneText, sceneContext, isLastScene, ctaType }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

  const promptStr = `Buatkan 1 kalimat teks promosi TikTok baru yang segar dan singkat (maksimal 8 kata) dalam bahasa Indonesia alami.
Konsep utama: "${prompt}"
Teks lama (jangan diulang): "${currentSceneText}"
Posisi: ${sceneContext}
${isLastScene ? (ctaType === "location" ? "Wajib mengandung ajakan cek tag lokasi/penawaran tempat di TikTok." : "Wajib mengandung ajakan klik promo/keranjang pembelian TikTok.") : ""}
Jangan mengarang harga, diskon, stok, atau klaim palsu. Balas HANYA kalimat teksnya saja tanpa tanda kutip.`;

  const models = await getAvailableGeminiModels(apiKey);
  for (const model of models) {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptStr }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 120 }
          })
        }
      );
      const data = await resp.json();
      if (resp.ok) {
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (txt) return txt.replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  throw new Error("Gagal meregenerasi teks frame.");
}
