import fs from "fs";
import path from "path";

const cwd = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(cwd, "backups", `pre-tiktok-go-${stamp}`);

// 1. Backup file inti sebelum modifikasi
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(path.join(cwd, "server.js"), path.join(backupDir, "server.js"));
fs.copyFileSync(path.join(cwd, "public/index.html"), path.join(backupDir, "index.html"));
console.log("✅ Backup dibuat di:", backupDir);

// 2. Buat direktori modul baru
fs.mkdirSync(path.join(cwd, "api/affiliate-tiktok"), { recursive: true });
fs.mkdirSync(path.join(cwd, "public/affiliate-tiktok"), { recursive: true });

// 3. Backend: Gemini Adapter (Memakai konfigurasi & model fallback CH Chat AI)
const adapterCode = `// Adapter Gemini terisolasi yang menggunakan konfigurasi CH Chat AI (process.env.GEMINI_API_KEY)
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

const VALID_ANIMATIONS = ["zoom-in", "zoom-out", "pan-left", "pan-right", "vertical-pan", "cinematic-zoom"];
const VALID_TRANSITIONS = ["fade", "flash", "blur", "slide", "whip", "beat"];

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

  // Normalisasi total durasi agar persis 20 atau 30 detik
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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi pada server.");
  }

  const systemPrompt = \`Kamu adalah Creative Director video pendek TikTok Affiliate & Promosi (Indonesia) di dalam CH AI Studio.
Tugasmu menganalisis \${imagesBase64.length} foto yang diunggah dan konsep prompt pengguna, lalu membuat JSON storyboard adaptif untuk video vertikal 9:16 berdurasi TEPAT \${duration} detik.

ATURAN UTAMA:
1. PROMPT PENGGUNA ADALAH DASAR KONSEP. Jangan mengunci pada template kaku.
2. Buat 1 sampai 5 scene utama. Setiap scene bisa menggunakan 1 atau beberapa foto (photoIndexes: array indeks 0 sampai \${imagesBase64.length - 1}). Total durasi semua scene HARUS tepat \${duration} detik.
3. TEKS PROMOSI: Bahasa Indonesia alami, singkat (maks 8-10 kata per scene) agar jelas dibaca di layar HP, punya hook kuat di scene 1, dan kesinambungan cerita.
4. ANTI-HALUSINASI: DILARANG KERAS mengarang harga, diskon, stok, sertifikasi, kandungan, manfaat medis, atau fasilitas tempat yang tidak disebut di prompt dan tidak terlihat di foto.
5. CTA FRAME TERAKHIR:
   - Jika produk affiliate (ctaType: "product"): CTA pembelian TikTok (misal: "KLIK PROMO TIKTOK PEMBELIAN DI SINI!" atau "CEK PROMONYA & BELI SEKARANG!").
   - Jika restoran/hotel/wisata (ctaType: "location"): CTA cek tag lokasi atau penawaran TikTok, JANGAN sebut pembelian produk/keranjang.
6. VARIASI ANIMASI & TRANSISI: Setiap scene harus punya alasan visual.
   - animation: "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "vertical-pan" | "cinematic-zoom"
   - transition: "fade" | "flash" | "blur" | "slide" | "whip" | "beat"
7. BEAT SYNC: Ketukan musik terdeteksi pada detik [\${beatTimestamps.join(", ")}]. Selaraskan pergantian durasi scene mendekati beat tersebut jika ada musik.

BALAS HANYA JSON MURNI TANPA MARKDOWN:
{
  "title": "Judul konsep",
  "duration": \${duration},
  "aspectRatio": "9:16",
  "language": "id",
  "ctaType": "product",
  "music": { "beatSync": \${hasMusic}, "volume": 0.85 },
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
}\`;

  const parts = [
    { text: "Konsep video dari pengguna: " + String(prompt) },
    ...imagesBase64.map(img => ({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: img.data
      }
    }))
  ];

  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        lastErr = new Error(data?.error?.message || "HTTP " + resp.status);
        continue;
      }
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/^\`\`\`json\\s*/i, "").replace(/\`\`\`\\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      return validateAndNormalizeStoryboard(parsed, duration, imagesBase64.length);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Gagal menghubungi Gemini dari CH Chat AI.");
}

export async function regenerateSingleSceneText({ prompt, currentSceneText, sceneContext, isLastScene, ctaType }) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");

  const promptStr = \`Buatkan 1 kalimat teks promosi TikTok baru yang segar dan singkat (maksimal 8 kata) dalam bahasa Indonesia alami.
Konsep utama: "\${prompt}"
Teks lama (jangan diulang): "\${currentSceneText}"
Posisi: \${sceneContext}
\${isLastScene ? (ctaType === "location" ? "Wajib mengandung ajakan cek tag lokasi/penawaran tempat di TikTok." : "Wajib mengandung ajakan klik promo/keranjang pembelian TikTok.") : ""}
Jangan mengarang harga, diskon, stok, atau klaim palsu. Balas HANYA kalimat teksnya saja tanpa tanda kutip.\`;

  for (const model of GEMINI_MODELS) {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY),
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
`;
fs.writeFileSync(path.join(cwd, "api/affiliate-tiktok/gemini-adapter.js"), adapterCode);

// 4. Backend: Route Storyboard & Regenerate Text
const storyboardRouteCode = `import { generateAffiliateStoryboard, regenerateSingleSceneText } from "./gemini-adapter.js";

export function registerAffiliateStoryboardRoute(app, { getClerkUserId, supabase }) {
  const STORYBOARD_COST = 2;

  app.post("/api/affiliate-tiktok/storyboard", async (req, res) => {
    try {
      const clerkUserId = await getClerkUserId(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Login diperlukan untuk menggunakan CH AI Affiliate TikTok Go." });
      }

      const { action } = req.body || {};

      // Regenerasi teks 1 frame saja (tanpa memotong kredit pembuatan storyboard penuh)
      if (action === "regenerate_text") {
        const text = await regenerateSingleSceneText({
          prompt: req.body.prompt || "",
          currentSceneText: req.body.currentSceneText || "",
          sceneContext: req.body.sceneContext || "",
          isLastScene: Boolean(req.body.isLastScene),
          ctaType: req.body.ctaType === "location" ? "location" : "product"
        });
        return res.json({ text });
      }

      const { prompt, imagesBase64, duration, beatTimestamps, hasMusic } = req.body || {};
      if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ error: "Konsep video (prompt) wajib diisi." });
      }
      if (!Array.isArray(imagesBase64) || imagesBase64.length < 5 || imagesBase64.length > 10) {
        return res.status(400).json({ error: "Unggah minimal 5 foto dan maksimal 10 foto." });
      }

      const targetDuration = Number(duration) === 30 ? 30 : 20;

      // Cek saldo kredit terlebih dahulu (JANGAN potong sebelum AI sukses)
      if (supabase) {
        const { data: currentCredits, error: credErr } = await supabase.rpc("get_or_create_user_credits", {
          p_clerk_user_id: clerkUserId
        });
        if (credErr) throw credErr;
        if (Number(currentCredits ?? 0) < STORYBOARD_COST) {
          return res.status(402).json({ error: \`Credit tidak mencukupi (butuh \${STORYBOARD_COST} credit).\` });
        }
      }

      // Jalankan Gemini via Adapter CH Chat AI
      const storyboard = await generateAffiliateStoryboard({
        prompt: String(prompt).trim(),
        imagesBase64,
        duration: targetDuration,
        beatTimestamps: Array.isArray(beatTimestamps) ? beatTimestamps : [],
        hasMusic: Boolean(hasMusic)
      });

      // Potong kredit HANYA setelah Gemini sukses menghasilkan storyboard valid
      let remainingCredits = null;
      if (supabase) {
        const { data: useData, error: useErr } = await supabase.rpc("use_user_credit", {
          p_clerk_user_id: clerkUserId,
          p_cost: STORYBOARD_COST
        });
        if (useErr) throw useErr;
        const result = Array.isArray(useData) ? useData[0] : useData;
        remainingCredits = Number(result?.credits ?? 0);
      }

      return res.json({
        storyboard,
        creditsUsed: STORYBOARD_COST,
        credits: remainingCredits
      });
    } catch (error) {
      console.error("[AffiliateTikTok Storyboard Error]:", error);
      return res.status(500).json({ error: error?.message || "Gagal menyusun storyboard AI." });
    }
  });
}
`;
fs.writeFileSync(path.join(cwd, "api/affiliate-tiktok/storyboard.js"), storyboardRouteCode);

// 5. Backend: Route Render Video MP4 via FFmpeg (Tanpa memotong kredit Gemini)
const renderRouteCode = `import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function escapeDrawtext(text) {
  return String(text || "")
    .replace(/\\\\/g, "\\\\\\\\")
    .replace(/:/g, "\\\\:")
    .replace(/'/g, "\\u2019")
    .replace(/%/g, "\\\\%")
    .replace(/\\n/g, "\\\\n");
}

function getZoompanFilter(animation, frames) {
  switch (animation) {
    case "zoom-in":
      return \`zoompan=z='min(zoom+0.0018,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=\${frames}:s=1080x1920:fps=30\`;
    case "zoom-out":
      return \`zoompan=z='if(lte(zoom,1.0),1.25,max(1.0,zoom-0.0018))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=\${frames}:s=1080x1920:fps=30\`;
    case "pan-left":
      return \`zoompan=z='1.18':x='max(0,(iw-iw/zoom)*(1-on/\${frames}))':y='ih/2-(ih/zoom/2)':d=\${frames}:s=1080x1920:fps=30\`;
    case "pan-right":
      return \`zoompan=z='1.18':x='min(iw-iw/zoom,(iw-iw/zoom)*(on/\${frames}))':y='ih/2-(ih/zoom/2)':d=\${frames}:s=1080x1920:fps=30\`;
    case "vertical-pan":
      return \`zoompan=z='1.18':x='iw/2-(iw/zoom/2)':y='min(ih-ih/zoom,(ih-ih/zoom)*(on/\${frames}))':d=\${frames}:s=1080x1920:fps=30\`;
    case "cinematic-zoom":
    default:
      return \`zoompan=z='min(zoom+0.0012,1.16)':x='iw/2-(iw/zoom/2)+sin(on/20)*12':y='ih/2-(ih/zoom/2)':d=\${frames}:s=1080x1920:fps=30\`;
  }
}

function mapXfade(transition) {
  switch (transition) {
    case "flash": return "fadewhite";
    case "slide": return "slideleft";
    case "whip": return "smoothleft";
    case "blur": return "distance";
    case "beat": return "zoomin";
    case "fade":
    default: return "fade";
  }
}

function getYPos(pos) {
  if (pos === "top") return "260";
  if (pos === "bottom") return "h-520";
  return "(h-text_h)/2";
}

function resolveFontOption() {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf"),
    "/system/fonts/Roboto-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
  ];
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return \`fontfile='\${p}':\`;
  }
  return "";
}

export function registerAffiliateRenderRoute(app, { getClerkUserId }) {
  app.get("/api/affiliate-tiktok/status", async (req, res) => {
    try {
      const { stdout } = await execFileAsync("ffmpeg", ["-version"]);
      return res.json({ ffmpegAvailable: true, version: stdout.split("\\n")[0] });
    } catch {
      return res.json({
        ffmpegAvailable: false,
        workerConfigured: Boolean(process.env.FFMPEG_WORKER_URL)
      });
    }
  });

  app.post("/api/affiliate-tiktok/render", async (req, res) => {
    let workDir = "";
    try {
      const clerkUserId = await getClerkUserId(req);
      if (!clerkUserId) {
        return res.status(401).json({ error: "Login diperlukan untuk merender video." });
      }

      const { storyboard, photosBase64, audioBase64, audioStartSec = 0 } = req.body || {};
      if (!storyboard || !Array.isArray(storyboard.scenes) || !Array.isArray(photosBase64) || photosBase64.length < 5) {
        return res.status(400).json({ error: "Data storyboard atau foto tidak lengkap." });
      }

      // Cek ketersediaan binary FFmpeg pada runtime saat ini
      let localFfmpeg = false;
      try {
        await execFileAsync("ffmpeg", ["-version"]);
        localFfmpeg = true;
      } catch {
        localFfmpeg = false;
      }

      if (!localFfmpeg) {
        if (process.env.FFMPEG_WORKER_URL) {
          const workerResp = await fetch(process.env.FFMPEG_WORKER_URL + "/render-affiliate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + (process.env.FFMPEG_WORKER_SECRET || "")
            },
            body: JSON.stringify({ storyboard, photosBase64, audioBase64, audioStartSec })
          });
          if (!workerResp.ok) throw new Error("FFmpeg Worker gagal merender video.");
          const arrBuf = await workerResp.arrayBuffer();
          res.setHeader("Content-Type", "video/mp4");
          return res.send(Buffer.from(arrBuf));
        }
        return res.status(503).json({
          error: "FFmpeg tidak tersedia di runtime serverless ini. Jalankan di Termux/VPS lokal atau hubungkan FFMPEG_WORKER_URL."
        });
      }

      workDir = await fs.mkdtemp(path.join(os.tmpdir(), "ch-tiktok-"));
      const photoPaths = [];
      for (let i = 0; i < photosBase64.length; i++) {
        const rawB64 = String(photosBase64[i].data || "").replace(/^data:image\\/\\w+;base64,/, "");
        const pPath = path.join(workDir, \`photo_\${i}.jpg\`);
        await fs.writeFile(pPath, Buffer.from(rawB64, "base64"));
        photoPaths.push(pPath);
      }

      let audioPath = null;
      if (audioBase64) {
        const rawAudio = String(audioBase64).replace(/^data:audio\\/[\\w.-]+;base64,/, "");
        audioPath = path.join(workDir, "music.mp3");
        await fs.writeFile(audioPath, Buffer.from(rawAudio, "base64"));
      }

      const targetDuration = Number(storyboard.duration) === 30 ? 30 : 20;
      const flatClips = [];
      storyboard.scenes.forEach((scene, sIdx) => {
        const isLastScene = sIdx === storyboard.scenes.length - 1;
        const pIdxs = Array.isArray(scene.photoIndexes) && scene.photoIndexes.length ? scene.photoIndexes : [0];
        const subDur = Math.max(1.5, Number((Number(scene.duration) / pIdxs.length).toFixed(2)));
        pIdxs.forEach(pIdx => {
          flatClips.push({
            photoPath: photoPaths[pIdx] || photoPaths[0],
            duration: subDur,
            scene,
            isLastScene
          });
        });
      });

      const args = ["-y"];
      flatClips.forEach(clip => {
        args.push("-loop", "1", "-t", String(clip.duration + 0.5), "-i", clip.photoPath);
      });

      if (audioPath) {
        args.push("-ss", String(Number(audioStartSec) || 0), "-t", String(targetDuration), "-i", audioPath);
      }

      const fontOpt = resolveFontOption();
      const filterChains = [];
      const transDur = 0.4;

      flatClips.forEach((clip, idx) => {
        const frames = Math.ceil((clip.duration + 0.5) * 30);
        const zoomFilter = getZoompanFilter(clip.scene.animation, frames);
        const combinedText = clip.isLastScene && storyboard.finalCTA
          ? \`\${clip.scene.text}\\n\${storyboard.finalCTA}\`
          : clip.scene.text;
        const safeText = escapeDrawtext(combinedText);
        const yPos = getYPos(clip.scene.textPosition);

        // Elemen panah visual mengarah ke area tag TikTok pojok kiri bawah tanpa menutupi area UI TikTok
        const ctaLabel = storyboard.ctaType === "location" ? "↙ CEK LOKASI DI SINI" : "↙ CEK PRODUK DI SINI";
        const ctaArrow = clip.isLastScene
          ? \`,drawtext=\${fontOpt}text='\${escapeDrawtext(ctaLabel)}':fontcolor=#00F0FF:fontsize=42:box=1:boxcolor=black@0.68:boxborderw=14:x=65:y=h-410\`
          : "";

        const trimDur = clip.duration + (idx < flatClips.length - 1 ? transDur : 0);
        filterChains.push(
          \`[\${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,\${zoomFilter},\` +
          \`drawtext=\${fontOpt}text='\${safeText}':fontcolor=\${clip.scene.textColor || "#FFFFFF"}:fontsize=\${clip.scene.fontSize || 54}:\` +
          \`box=1:boxcolor=black@0.58:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=\${yPos}\${ctaArrow},\` +
          \`trim=duration=\${trimDur},setpts=PTS-STARTPTS[v\${idx}]\`
        );
      });

      let lastStream = "[v0]";
      let offsetAcc = flatClips[0].duration;
      for (let i = 1; i < flatClips.length; i++) {
        const xfadeType = mapXfade(flatClips[i].scene.transition);
        const outLabel = i === flatClips.length - 1 ? "[vout]" : \`[vx\${i}]\`;
        const offset = Math.max(0.1, Number((offsetAcc - transDur).toFixed(2)));
        filterChains.push(\`\${lastStream}[v\${i}]xfade=transition=\${xfadeType}:duration=\${transDur}:offset=\${offset}\${outLabel}\`);
        lastStream = outLabel;
        offsetAcc += flatClips[i].duration - transDur;
      }
      if (flatClips.length === 1) {
        filterChains.push("[v0]null[vout]");
      }

      if (audioPath) {
        const aIdx = flatClips.length;
        const vol = Math.min(1, Math.max(0.1, Number(storyboard.music?.volume ?? 0.85)));
        const fadeStart = Math.max(0, targetDuration - 1.5);
        filterChains.push(\`[\${aIdx}:a]volume=\${vol},afade=t=out:st=\${fadeStart}:d=1.5[aout]\`);
      }

      const outputPath = path.join(workDir, "tiktok_go_output.mp4");
      args.push("-filter_complex", filterChains.join(";"), "-map", "[vout]");
      if (audioPath) {
        args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "192k");
      }
      args.push(
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-t", String(targetDuration),
        "-movflags", "+faststart",
        outputPath
      );

      await execFileAsync("ffmpeg", args, { timeout: 180000 });
      const mp4Buffer = await fs.readFile(outputPath);

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", \`attachment; filename="CH-Affiliate-TikTok-\${Date.now()}.mp4"\`);
      return res.send(mp4Buffer);
    } catch (error) {
      console.error("[AffiliateTikTok Render Error]:", error);
      return res.status(500).json({ error: error?.message || "Gagal merender video FFmpeg." });
    } finally {
      if (workDir) {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  });
}
`;
fs.writeFileSync(path.join(cwd, "api/affiliate-tiktok/render.js"), renderRouteCode);

// 6. Frontend CSS Mobile-First (Identitas CH AI STUDIO: Gelap + Biru, Ungu, Pink)
const cssCode = `/* CH AI AFFILIATE TIKTOK GO - Mobile Premium Theme */
#page-affiliate-tiktok {
  padding-bottom: 96px;
}
.ttg-hero-card {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(139, 92, 246, 0.16), rgba(236, 72, 153, 0.14));
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 18px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.ttg-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 6px;
}
.ttg-card {
  background: rgba(15, 16, 28, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  padding: 15px;
  margin-bottom: 14px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}
.ttg-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ttg-card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f8fafc;
}
.ttg-upload-drop {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1.5px dashed rgba(168, 85, 247, 0.55);
  background: rgba(168, 85, 247, 0.08);
  color: #e9d5ff;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  text-align: center;
}
.ttg-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.ttg-photo-item {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #05050a;
}
.ttg-photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ttg-photo-tag {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.75);
  color: #38bdf8;
}
.ttg-photo-actions {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.78);
  border-radius: 8px;
  padding: 3px;
}
.ttg-photo-actions button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.72rem;
  padding: 2px 5px;
  cursor: pointer;
}
.ttg-textarea, .ttg-input, .ttg-select {
  width: 100%;
  background: #080911;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  color: #fff;
  padding: 10px 12px;
  font-size: 0.82rem;
  box-sizing: border-box;
}
.ttg-textarea:focus, .ttg-input:focus, .ttg-select:focus {
  outline: none;
  border-color: #38bdf8;
}
.ttg-dur-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
.ttg-dur-btn {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #080911;
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.ttg-dur-btn.active {
  background: linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899);
  color: #fff;
  border-color: transparent;
}
.ttg-primary-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #00f0ff, #8b5cf6, #ec4899);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 12px;
  box-shadow: 0 8px 22px rgba(139, 92, 246, 0.35);
}
.ttg-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ttg-scene-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 10px;
}
.ttg-scene-tab {
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #080911;
  color: #cbd5e1;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.ttg-scene-tab.active {
  background: #8b5cf6;
  color: #fff;
  border-color: #a78bfa;
}
.ttg-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.ttg-label {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-bottom: 4px;
}
.ttg-thumb-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-top: 6px;
}
.ttg-thumb-btn {
  width: 44px;
  height: 68px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  opacity: 0.45;
  flex-shrink: 0;
  cursor: pointer;
}
.ttg-thumb-btn.selected {
  border-color: #00f0ff;
  opacity: 1;
}
.ttg-thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ttg-status-box {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.78rem;
  margin-bottom: 12px;
  display: none;
}
.ttg-status-box.error {
  display: block;
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fecaca;
}
.ttg-status-box.info {
  display: block;
  background: rgba(16, 185, 129, 0.16);
  border: 1px solid rgba(16, 185, 129, 0.45);
  color: #a7f3d0;
}
`;
fs.writeFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.css"), cssCode);

// 7. Frontend JS Module (Upload 5-10 foto, kompresi, Beat Detection, Editor Frame, Render FFmpeg)
const jsCode = `(() => {
  const state = {
    photos: [], // { id, base64, mimeType, previewUrl }
    duration: 20,
    audioBase64: null,
    audioFile: null,
    audioStartSec: 0,
    audioVolume: 0.85,
    beatTimestamps: [],
    storyboard: null,
    activeSceneIdx: 0,
    renderedUrl: null
  };

  function showStatus(msg, type = "error") {
    const el = document.getElementById("ttg-status");
    if (!el) return;
    if (!msg) {
      el.className = "ttg-status-box";
      el.textContent = "";
      return;
    }
    el.className = "ttg-status-box " + type;
    el.textContent = msg;
  }

  async function getAuthHeader() {
    if (typeof window.getFreshClerkToken === "function") {
      const t = await window.getFreshClerkToken(false);
      if (t) return { "Authorization": "Bearer " + t };
    }
    if (window.Clerk?.session) {
      const t = await window.Clerk.session.getToken();
      if (t) return { "Authorization": "Bearer " + t };
    }
    return {};
  }

  // Kompresi foto di Android agar cepat diunggah & ringan di memori
  function compressPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve({
            id: "ph_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            previewUrl: dataUrl,
            base64: dataUrl.split(",")[1],
            mimeType: "image/jpeg"
          });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Deteksi beat audio nyata menggunakan Web Audio API
  async function analyzeAudioBeats(file, startSec, durSec) {
    try {
      const arrBuf = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuf = await ctx.decodeAudioData(arrBuf);
      const sr = audioBuf.sampleRate;
      const ch = audioBuf.getChannelData(0);
      const startSample = Math.floor(startSec * sr);
      const endSample = Math.min(ch.length, Math.floor((startSec + durSec) * sr));
      const winSize = Math.floor(sr * 0.05);
      const energies = [];

      for (let i = startSample; i < endSample; i += winSize) {
        let sum = 0;
        const lim = Math.min(i + winSize, endSample);
        for (let j = i; j < lim; j++) sum += ch[j] * ch[j];
        energies.push({
          time: Number(((i - startSample) / sr).toFixed(2)),
          rms: Math.sqrt(sum / Math.max(1, lim - i))
        });
      }

      const beats = [];
      let lastBeat = 0;
      for (let i = 4; i < energies.length - 4; i++) {
        const slice = energies.slice(i - 4, i + 4);
        const avg = slice.reduce((a, b) => a + b.rms, 0) / slice.length;
        if (energies[i].rms > avg * 1.35 && energies[i].rms > 0.07 && energies[i].time - lastBeat >= 1.8) {
          beats.push(energies[i].time);
          lastBeat = energies[i].time;
        }
      }
      await ctx.close();
      return beats;
    } catch {
      return [];
    }
  }

  function renderPhotoGrid() {
    const grid = document.getElementById("ttg-photo-grid");
    const counter = document.getElementById("ttg-photo-count");
    if (counter) counter.textContent = \`\${state.photos.length}/10 Foto\`;
    if (!grid) return;

    grid.innerHTML = state.photos.map((p, idx) => \`
      <div class="ttg-photo-item">
        <img src="\${p.previewUrl}" alt="Foto \${idx + 1}">
        <span class="ttg-photo-tag">#\${idx + 1}\${idx === 0 ? " Utama" : ""}</span>
        <div class="ttg-photo-actions">
          <button type="button" onclick="window.ttgMovePhoto(\${idx}, -1)">◀</button>
          <button type="button" onclick="window.ttgMovePhoto(\${idx}, 1)">▶</button>
          <button type="button" style="color:#f472b6" onclick="window.ttgRemovePhoto('\${p.id}')">✕</button>
        </div>
      </div>
    \`).join("");
  }

  window.ttgMovePhoto = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= state.photos.length) return;
    const tmp = state.photos[idx];
    state.photos[idx] = state.photos[target];
    state.photos[target] = tmp;
    renderPhotoGrid();
  };

  window.ttgRemovePhoto = (id) => {
    state.photos = state.photos.filter(p => p.id !== id);
    renderPhotoGrid();
  };

  window.ttgSetDuration = (sec) => {
    state.duration = sec;
    document.querySelectorAll(".ttg-dur-btn").forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.dur) === sec);
    });
  };

  function renderStoryboardEditor() {
    const wrap = document.getElementById("ttg-editor-section");
    if (!wrap) return;
    if (!state.storyboard) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";

    const tabsEl = document.getElementById("ttg-scene-tabs");
    tabsEl.innerHTML = state.storyboard.scenes.map((sc, idx) => \`
      <button type="button" class="ttg-scene-tab \${idx === state.activeSceneIdx ? "active" : ""}" onclick="window.ttgSelectScene(\${idx})">
        Frame \${sc.scene} (\${sc.duration}s)
      </button>
    \`).join("");

    const sc = state.storyboard.scenes[state.activeSceneIdx];
    if (!sc) return;

    document.getElementById("ttg-scene-text").value = sc.text;
    document.getElementById("ttg-scene-anim").value = sc.animation;
    document.getElementById("ttg-scene-trans").value = sc.transition;
    document.getElementById("ttg-scene-pos").value = sc.textPosition;
    document.getElementById("ttg-scene-size").value = sc.fontSize;
    document.getElementById("ttg-scene-color").value = sc.textColor || "#FFFFFF";
    document.getElementById("ttg-scene-dur").value = sc.duration;
    document.getElementById("ttg-final-cta").value = state.storyboard.finalCTA || "";

    const strip = document.getElementById("ttg-scene-photos");
    strip.innerHTML = state.photos.map((p, pIdx) => {
      const isSel = sc.photoIndexes.includes(pIdx);
      return \`
        <button type="button" class="ttg-thumb-btn \${isSel ? "selected" : ""}" onclick="window.ttgToggleScenePhoto(\${pIdx})">
          <img src="\${p.previewUrl}" alt="">
        </button>
      \`;
    }).join("");
  }

  window.ttgSelectScene = (idx) => {
    state.activeSceneIdx = idx;
    renderStoryboardEditor();
  };

  window.ttgToggleScenePhoto = (pIdx) => {
    const sc = state.storyboard?.scenes[state.activeSceneIdx];
    if (!sc) return;
    if (sc.photoIndexes.includes(pIdx)) {
      if (sc.photoIndexes.length > 1) {
        sc.photoIndexes = sc.photoIndexes.filter(i => i !== pIdx);
      }
    } else {
      sc.photoIndexes.push(pIdx);
    }
    renderStoryboardEditor();
  };

  window.ttgUpdateCurrentScene = () => {
    const sc = state.storyboard?.scenes[state.activeSceneIdx];
    if (!sc) return;
    sc.text = document.getElementById("ttg-scene-text").value;
    sc.animation = document.getElementById("ttg-scene-anim").value;
    sc.transition = document.getElementById("ttg-scene-trans").value;
    sc.textPosition = document.getElementById("ttg-scene-pos").value;
    sc.fontSize = Number(document.getElementById("ttg-scene-size").value) || 54;
    sc.textColor = document.getElementById("ttg-scene-color").value || "#FFFFFF";
    sc.duration = Math.max(1.5, Number(document.getElementById("ttg-scene-dur").value) || sc.duration);
    state.storyboard.finalCTA = document.getElementById("ttg-final-cta").value;
  };

  window.ttgRegenerateSceneText = async () => {
    const sc = state.storyboard?.scenes[state.activeSceneIdx];
    if (!sc) return;
    const btn = document.getElementById("ttg-regen-text-btn");
    if (btn) btn.disabled = true;
    try {
      const headers = { "Content-Type": "application/json", ...(await getAuthHeader()) };
      const resp = await fetch("/api/affiliate-tiktok/storyboard", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "regenerate_text",
          prompt: document.getElementById("ttg-prompt").value,
          currentSceneText: sc.text,
          sceneContext: \`Frame \${sc.scene} dari \${state.storyboard.scenes.length}\`,
          isLastScene: state.activeSceneIdx === state.storyboard.scenes.length - 1,
          ctaType: state.storyboard.ctaType
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Gagal regenerasi teks.");
      sc.text = data.text;
      renderStoryboardEditor();
    } catch (e) {
      showStatus(e.message, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.ttgGenerateStoryboard = async () => {
    showStatus("");
    const prompt = (document.getElementById("ttg-prompt")?.value || "").trim();
    if (state.photos.length < 5 || state.photos.length > 10) {
      return showStatus("Unggah minimal 5 foto dan maksimal 10 foto terlebih dahulu.", "error");
    }
    if (!prompt) {
      return showStatus("Tuliskan konsep video pada kolom prompt.", "error");
    }

    const btn = document.getElementById("ttg-gen-sb-btn");
    btn.disabled = true;
    btn.textContent = "Gemini Menyusun Storyboard...";
    try {
      const headers = { "Content-Type": "application/json", ...(await getAuthHeader()) };
      const resp = await fetch("/api/affiliate-tiktok/storyboard", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt,
          imagesBase64: state.photos.map(p => ({ mimeType: p.mimeType, data: p.base64 })),
          duration: state.duration,
          beatTimestamps: state.beatTimestamps,
          hasMusic: Boolean(state.audioBase64)
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Gagal membuat storyboard.");

      state.storyboard = data.storyboard;
      state.activeSceneIdx = 0;
      renderStoryboardEditor();
      if (typeof window.refreshCredits === "function") window.refreshCredits();
      showStatus("Storyboard AI berhasil dibuat! Silakan sesuaikan tiap frame atau langsung render.", "info");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "✨ Buat Storyboard AI Otomatis (2 Credit)";
    }
  };

  window.ttgRenderVideo = async () => {
    if (!state.storyboard) return;
    window.ttgUpdateCurrentScene();
    showStatus("");

    const btn = document.getElementById("ttg-render-btn");
    btn.disabled = true;
    btn.textContent = "⏳ Merender Video FFmpeg 9:16...";
    try {
      state.storyboard.music.volume = state.audioVolume;
      const headers = { "Content-Type": "application/json", ...(await getAuthHeader()) };
      const resp = await fetch("/api/affiliate-tiktok/render", {
        method: "POST",
        headers,
        body: JSON.stringify({
          storyboard: state.storyboard,
          photosBase64: state.photos.map(p => ({ data: p.base64 })),
          audioBase64: state.audioBase64,
          audioStartSec: state.audioStartSec
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "Rendering video gagal.");
      }

      const blob = await resp.blob();
      if (state.renderedUrl) URL.revokeObjectURL(state.renderedUrl);
      state.renderedUrl = URL.createObjectURL(blob);

      const previewWrap = document.getElementById("ttg-result-section");
      const videoEl = document.getElementById("ttg-preview-video");
      const dlEl = document.getElementById("ttg-download-link");
      videoEl.src = state.renderedUrl;
      dlEl.href = state.renderedUrl;
      dlEl.download = \`CH-AI-Affiliate-TikTok-\${Date.now()}.mp4\`;
      previewWrap.style.display = "block";
      previewWrap.scrollIntoView({ behavior: "smooth" });
      showStatus("Video MP4 1080×1920 (30 FPS) berhasil dirender!", "info");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "🎬 Render Video MP4 TikTok";
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const photoInput = document.getElementById("ttg-photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", async (e) => {
        showStatus("");
        const files = Array.from(e.target.files || []);
        const slots = 10 - state.photos.length;
        for (const f of files.slice(0, slots)) {
          const item = await compressPhotoFile(f);
          state.photos.push(item);
        }
        renderPhotoGrid();
        photoInput.value = "";
      });
    }

    const audioInput = document.getElementById("ttg-audio-input");
    if (audioInput) {
      audioInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        state.audioFile = file;
        const preview = document.getElementById("ttg-audio-preview");
        const box = document.getElementById("ttg-audio-controls");
        if (preview) preview.src = URL.createObjectURL(file);
        if (box) box.style.display = "block";

        const reader = new FileReader();
        reader.onload = () => { state.audioBase64 = reader.result; };
        reader.readAsDataURL(file);

        const beats = await analyzeAudioBeats(file, state.audioStartSec, state.duration);
        state.beatTimestamps = beats;
        const badge = document.getElementById("ttg-beat-badge");
        if (badge) badge.textContent = beats.length ? \`\${beats.length} Beat Terdeteksi\` : "Audio Siap";
      });
    }

    const startRange = document.getElementById("ttg-audio-start");
    if (startRange) {
      startRange.addEventListener("input", async (e) => {
        state.audioStartSec = Number(e.target.value) || 0;
        document.getElementById("ttg-audio-start-val").textContent = state.audioStartSec + "s";
        if (state.audioFile) {
          state.beatTimestamps = await analyzeAudioBeats(state.audioFile, state.audioStartSec, state.duration);
        }
      });
    }

    const volRange = document.getElementById("ttg-audio-vol");
    if (volRange) {
      volRange.addEventListener("input", (e) => {
        state.audioVolume = Number(e.target.value) || 0.85;
        document.getElementById("ttg-audio-vol-val").textContent = Math.round(state.audioVolume * 100) + "%";
      });
    }
  });
})();
`;
fs.writeFileSync(path.join(cwd, "public/affiliate-tiktok/tiktok-go.js"), jsCode);

// 8. Integrasikan ke server.js tanpa merusak fitur yang ada
let serverContent = fs.readFileSync(path.join(cwd, "server.js"), "utf8");
if (!serverContent.includes("registerAffiliateStoryboardRoute")) {
  const importHook = `import { registerAffiliateStoryboardRoute } from "./api/affiliate-tiktok/storyboard.js";\nimport { registerAffiliateRenderRoute } from "./api/affiliate-tiktok/render.js";\n`;
  serverContent = importHook + serverContent;

  const mountTarget = `app.post("/api/storytelling/generate-script"`;
  const mountCode = `registerAffiliateStoryboardRoute(app, { getClerkUserId, supabase });\nregisterAffiliateRenderRoute(app, { getClerkUserId });\n\n` + mountTarget;
  serverContent = serverContent.replace(mountTarget, mountCode);

  // Naikkan limit JSON payload Express untuk 10 foto terkompresi
  serverContent = serverContent.replace(/express\.json\(\)/g, 'express.json({ limit: "35mb" })');
  fs.writeFileSync(path.join(cwd, "server.js"), serverContent);
  console.log("✅ server.js berhasil diperbarui.");
}

// 9. Integrasikan kartu & halaman ke public/index.html tanpa merusak modul lama
let htmlContent = fs.readFileSync(path.join(cwd, "public/index.html"), "utf8");
if (!htmlContent.includes("page-affiliate-tiktok")) {
  // Tambahkan CSS
  htmlContent = htmlContent.replace(
    `<link rel="stylesheet" href="storytelling/storytelling.css?v=ch-st-v1">`,
    `<link rel="stylesheet" href="storytelling/storytelling.css?v=ch-st-v1">\n  <link rel="stylesheet" href="affiliate-tiktok/tiktok-go.css?v=1">`
  );

  // Tambahkan tombol kartu di Beranda tepat setelah CH AI Storytelling
  const cardMarker = `<strong>CH AI Storytelling</strong>
            <small>Studio Film AI • Naskah, Karakter, Storyboard &amp; Video</small>
          </span>
        </button>`;
  const newCardHtml = cardMarker + `
        <button type="button" class="v6-app-tile v6-tile-storytelling" onclick="go('affiliate-tiktok')" style="border-color:rgba(0,240,255,0.35);">
          <span class="v6-tile-icon cyan">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </span>
          <span class="v6-tile-st-copy">
            <strong>CH AI AFFILIATE TIKTOK GO</strong>
            <small>5–10 Foto ke Video Promosi TikTok • Beat Sync &amp; Storyboard AI</small>
          </span>
        </button>`;
  htmlContent = htmlContent.replace(cardMarker, newCardHtml);

  // Tambahkan Section Halaman sebelum <!-- ISOLATED MODULE: CH AI STORYTELLING STUDIO -->
  const pageSectionHtml = `
    <!-- ======================================================================
         ISOLATED MODULE: CH AI AFFILIATE TIKTOK GO
         ====================================================================== -->
    <section id="page-affiliate-tiktok" class="page">
      <div class="v6-subpage-bar">
        <div class="v6-back-title">
          <button type="button" class="v6-back-btn" onclick="go('home')">←</button>
          <h2>CH AI AFFILIATE TIKTOK GO</h2>
        </div>
      </div>

      <div class="ttg-hero-card">
        <span class="ttg-badge">PROMPT-DRIVEN PHOTO TO BEAT VIDEO</span>
        <div style="font-size:0.8rem;color:#cbd5e1;">Susun 5–10 foto produk/lokasi menjadi video TikTok 9:16 (1080×1920) lengkap dengan teks promosi AI, animasi, transisi &amp; beat sync.</div>
      </div>

      <div id="ttg-status" class="ttg-status-box"></div>

      <!-- 1. UPLOAD FOTO -->
      <div class="ttg-card">
        <div class="ttg-card-header">
          <span class="ttg-card-title">1. Upload Foto (5–10 Foto)</span>
          <span id="ttg-photo-count" style="font-size:0.75rem;color:#38bdf8;font-weight:700;">0/10 Foto</span>
        </div>
        <input type="file" id="ttg-photo-input" accept="image/*" multiple style="display:none;">
        <button type="button" class="ttg-upload-drop" onclick="document.getElementById('ttg-photo-input').click()">
          + Pilih Banyak Foto Sekaligus (Min. 5, Maks. 10)
        </button>
        <div id="ttg-photo-grid" class="ttg-photo-grid"></div>
      </div>

      <!-- 2. PROMPT & DURASI -->
      <div class="ttg-card">
        <div class="ttg-card-header">
          <span class="ttg-card-title">2. Konsep Video (Prompt Bebas)</span>
        </div>
        <textarea id="ttg-prompt" class="ttg-textarea" rows="4" placeholder="Contoh: Buat video promosi produk dengan storytelling bikin penasaran, atau video cinematic restoran/hotel/wisata..."></textarea>
        <div class="ttg-dur-row">
          <button type="button" class="ttg-dur-btn active" data-dur="20" onclick="window.ttgSetDuration(20)">20 Detik (9:16)</button>
          <button type="button" class="ttg-dur-btn" data-dur="30" onclick="window.ttgSetDuration(30)">30 Detik (9:16)</button>
        </div>
      </div>

      <!-- 3. MUSIK & BEAT SYNC -->
      <div class="ttg-card">
        <div class="ttg-card-header">
          <span class="ttg-card-title">3. Musik &amp; Beat Sync</span>
          <span id="ttg-beat-badge" style="font-size:0.7rem;color:#34d399;font-weight:700;">Opsional</span>
        </div>
        <input type="file" id="ttg-audio-input" accept="audio/*" class="ttg-input">
        <div id="ttg-audio-controls" style="display:none;margin-top:10px;">
          <audio id="ttg-audio-preview" controls style="width:100%;height:34px;"></audio>
          <div class="ttg-grid-2">
            <div>
              <span class="ttg-label">Mulai Detik: <b id="ttg-audio-start-val">0s</b></span>
              <input type="range" id="ttg-audio-start" min="0" max="60" value="0" style="width:100%;">
            </div>
            <div>
              <span class="ttg-label">Volume: <b id="ttg-audio-vol-val">85%</b></span>
              <input type="range" id="ttg-audio-vol" min="0.1" max="1" step="0.05" value="0.85" style="width:100%;">
            </div>
          </div>
        </div>
        <button type="button" id="ttg-gen-sb-btn" class="ttg-primary-btn" onclick="window.ttgGenerateStoryboard()">
          ✨ Buat Storyboard AI Otomatis (2 Credit)
        </button>
      </div>

      <!-- 4. EDITOR FRAME -->
      <div id="ttg-editor-section" class="ttg-card" style="display:none;">
        <div class="ttg-card-header">
          <span class="ttg-card-title">4. Editor Storyboard Per-Frame</span>
        </div>
        <div id="ttg-scene-tabs" class="ttg-scene-tabs"></div>

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="ttg-label" style="margin:0;">Teks Promosi Frame</span>
            <button type="button" id="ttg-regen-text-btn" onclick="window.ttgRegenerateSceneText()" style="background:none;border:none;color:#38bdf8;font-size:0.72rem;font-weight:700;cursor:pointer;">↻ Regenerasi Teks AI</button>
          </div>
          <textarea id="ttg-scene-text" class="ttg-textarea" rows="2" onchange="window.ttgUpdateCurrentScene()"></textarea>
        </div>

        <div class="ttg-grid-2">
          <div>
            <span class="ttg-label">Animasi Gerak</span>
            <select id="ttg-scene-anim" class="ttg-select" onchange="window.ttgUpdateCurrentScene()">
              <option value="zoom-in">Zoom In</option>
              <option value="zoom-out">Zoom Out</option>
              <option value="pan-left">Pan Kiri</option>
              <option value="pan-right">Pan Kanan</option>
              <option value="vertical-pan">Gerakan Vertikal</option>
              <option value="cinematic-zoom">Cinematic Zoom</option>
            </select>
          </div>
          <div>
            <span class="ttg-label">Transisi</span>
            <select id="ttg-scene-trans" class="ttg-select" onchange="window.ttgUpdateCurrentScene()">
              <option value="fade">Fade</option>
              <option value="flash">Flash</option>
              <option value="blur">Blur Transition</option>
              <option value="slide">Slide</option>
              <option value="whip">Whip Transition</option>
              <option value="beat">Beat Transition</option>
            </select>
          </div>
          <div>
            <span class="ttg-label">Posisi Teks</span>
            <select id="ttg-scene-pos" class="ttg-select" onchange="window.ttgUpdateCurrentScene()">
              <option value="top">Atas</option>
              <option value="center">Tengah</option>
              <option value="bottom">Bawah</option>
            </select>
          </div>
          <div>
            <span class="ttg-label">Durasi Frame (detik)</span>
            <input type="number" id="ttg-scene-dur" step="0.5" min="1.5" max="15" class="ttg-input" onchange="window.ttgUpdateCurrentScene()">
          </div>
          <div>
            <span class="ttg-label">Ukuran Teks (px)</span>
            <input type="number" id="ttg-scene-size" min="32" max="84" class="ttg-input" onchange="window.ttgUpdateCurrentScene()">
          </div>
          <div>
            <span class="ttg-label">Warna Teks</span>
            <input type="color" id="ttg-scene-color" value="#FFFFFF" class="ttg-input" style="height:38px;padding:3px;" onchange="window.ttgUpdateCurrentScene()">
          </div>
        </div>

        <div style="margin-top:8px;">
          <span class="ttg-label">Foto di Frame Ini (Klik untuk pilih/ganti):</span>
          <div id="ttg-scene-photos" class="ttg-thumb-strip"></div>
        </div>

        <div style="margin-top:10px;">
          <span class="ttg-label">CTA Frame Terakhir</span>
          <input type="text" id="ttg-final-cta" class="ttg-input" onchange="window.ttgUpdateCurrentScene()">
        </div>

        <button type="button" id="ttg-render-btn" class="ttg-primary-btn" style="background:linear-gradient(135deg,#10b981,#06b6d4);color:#041014;" onclick="window.ttgRenderVideo()">
          🎬 Render Video MP4 TikTok
        </button>
      </div>

      <!-- 5. HASIL VIDEO PREVIEW & DOWNLOAD -->
      <div id="ttg-result-section" class="ttg-card" style="display:none;border-color:rgba(16,185,129,0.5);">
        <div class="ttg-card-header">
          <span class="ttg-card-title" style="color:#34d399;">✅ Video TikTok 9:16 Siap</span>
        </div>
        <video id="ttg-preview-video" controls playsinline style="width:100%;aspect-ratio:9/16;border-radius:14px;background:#000;"></video>
        <a id="ttg-download-link" class="ttg-primary-btn" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box;">
          ⬇️ Download MP4 (1080×1920 • 30 FPS)
        </a>
      </div>
    </section>
`;

  const storyComment = `<!-- ======================================================================
         ISOLATED MODULE: CH AI STORYTELLING STUDIO`;
  htmlContent = htmlContent.replace(storyComment, pageSectionHtml + "\n    " + storyComment);

  // Tambahkan script sebelum </body>
  htmlContent = htmlContent.replace(
    `</body>`,
    `  <script src="affiliate-tiktok/tiktok-go.js?v=1"></script>\n</body>`
  );

  fs.writeFileSync(path.join(cwd, "public/index.html"), htmlContent);
  console.log("✅ public/index.html berhasil diperbarui.");
}
