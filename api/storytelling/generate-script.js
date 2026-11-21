export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const title = String(body.title || "Cerita AI").trim();
    const idea = String(body.idea || "").trim();
    const duration = Math.max(10, Math.min(180, Number(body.duration) || 30));
    const sceneCount = Math.max(1, Math.min(12, Number(body.sceneCount) || 5));
    const style = String(body.style || "Photorealistic Cinema");
    const mood = String(body.mood || "Emosional & Epik");
    const narrationMode = String(body.narrationMode || "narration_dialogue");
    const dialogueMode = String(body.dialogueMode || "on");
    const char = body.character && typeof body.character === "object" ? body.character : {
      name: "Tokoh Utama",
      physical: "Wajah ekspresif, pencahayaan sinematik",
      outfit: "Jaket modern",
      expression: "Fokus"
    };

    const perSceneSec = Math.max(3, Math.round(duration / sceneCount));
    const charLock = `${char.name || "Tokoh Utama"}, ${char.physical || "sinematik"}, wearing ${char.outfit || "jaket modern"}`;

    if (process.env.GEMINI_API_KEY) {
      const prompt = `Kamu adalah sutradara dan penulis naskah film pendek profesional untuk CH AI Studio.
Buat naskah storytelling terstruktur dalam format JSON MURNI (tanpa markdown) berdasarkan:
- Judul: ${title}
- Ide cerita: ${idea || title}
- Total durasi: ${duration} detik dibagi menjadi tepat ${sceneCount} adegan (masing-masing sekitar ${perSceneSec} detik)
- Gaya visual: ${style}
- Nuansa/mood: ${mood}
- Karakter utama (konsisten di semua scene): ${charLock}, ekspresi awal: ${char.expression || "Fokus"}
- Mode narasi: ${narrationMode}
- Mode dialog: ${dialogueMode}

Kembalikan JSON persis dengan struktur:
{
  "title": "${title}",
  "hook": "...",
  "synopsis": "...",
  "conflict": "...",
  "climax": "...",
  "ending": "...",
  "message": "...",
  "scenes": [
    {
      "number": 1,
      "title": "...",
      "description": "...",
      "duration": ${perSceneSec},
      "character": "${char.name || "Tokoh Utama"}",
      "location": "...",
      "action": "...",
      "expression": "...",
      "cameraAngle": "...",
      "cameraMovement": "...",
      "lighting": "...",
      "imagePrompt": "Single frame cinematic shot in English describing exact character appearance (${charLock}), setting, lighting, camera angle, ${style}, single scene only, no collage",
      "videoPrompt": "Smooth motion prompt in English for image-to-video animation",
      "narration": "${narrationMode === "off" ? "" : "Narasi Bahasa Indonesia"}",
      "dialogue": "${dialogueMode === "off" ? "" : "Dialog singkat Bahasa Indonesia"}",
      "soundEffect": "..."
    }
  ]
}`;

      for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
        try {
          const gResp = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.8,
                  maxOutputTokens: 4096,
                  responseMimeType: "application/json"
                }
              })
            }
          );
          if (!gResp.ok) continue;
          const gData = await gResp.json();
          const rawText = gData?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
          if (!rawText) continue;
          const cleaned = rawText.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/i, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
            const scenes = parsed.scenes.slice(0, sceneCount).map((sc, i) => ({
              id: `sc_${Date.now()}_${i + 1}`,
              number: i + 1,
              title: sc.title || `Adegan ${i + 1} — ${title}`,
              description: sc.description || idea,
              duration: Number(sc.duration) || perSceneSec,
              character: sc.character || char.name || "Tokoh Utama",
              location: sc.location || "Lokasi utama sinematik",
              action: sc.action || "",
              expression: sc.expression || char.expression || "Fokus",
              cameraAngle: sc.cameraAngle || "Medium Close-Up",
              cameraMovement: sc.cameraMovement || "Slow Dolly In",
              lighting: sc.lighting || `${mood} lighting`,
              imagePrompt: sc.imagePrompt || `Single frame cinematic shot, ${style}, ${charLock}, ${sc.description || idea}, single scene only, no collage`,
              videoPrompt: sc.videoPrompt || `Smooth ${perSceneSec}s cinematic motion, ${mood} atmosphere`,
              negativePrompt: "collage, split screen, grid, watermark, text, blurry, extra limbs",
              narration: narrationMode === "off" ? "" : (sc.narration || ""),
              dialogue: dialogueMode === "off" ? "" : (sc.dialogue || ""),
              soundEffect: sc.soundEffect || "Ambient cinematic atmosphere",
              imageStatus: "Waiting",
              videoStatus: "Waiting",
              imageUrl: "",
              videoUrl: ""
            }));
            return res.status(200).json({
              ok: true,
              title: parsed.title || title,
              hook: parsed.hook || `Pembuka sinematik untuk ${title}`,
              synopsis: parsed.synopsis || idea,
              conflict: parsed.conflict || "",
              climax: parsed.climax || "",
              ending: parsed.ending || "",
              message: parsed.message || "",
              provider: "Gemini",
              scenes
            });
          }
        } catch (aiErr) {
          console.error("[Storytelling Gemini Script Error]", model, aiErr?.message || aiErr);
        }
      }
    }

    // Fallback aman jika API sibuk
    const beats = ["Hook Pembuka", "Pengenalan Konflik", "Eskalasi Ketegangan", "Klimaks", "Resolusi & Pesan"];
    const scenes = Array.from({ length: sceneCount }, (_, i) => {
      const num = i + 1;
      const beat = beats[i] || `Adegan ${num}`;
      const isOdd = num % 2 === 1;
      return {
        id: `sc_${Date.now()}_${num}`,
        number: num,
        title: `${beat} — ${title}`,
        description: `${idea} (${beat})`,
        duration: perSceneSec,
        character: char.name || "Tokoh Utama",
        location: isOdd ? "Lokasi utama penuh atmosfer" : "Sudut lokasi dengan pencahayaan kontras",
        action: `${char.name || "Tokoh Utama"} menjalani momen ${beat.toLowerCase()}`,
        expression: char.expression || "Fokus",
        cameraAngle: num === 1 ? "Wide Establishing Shot" : "Medium Close-Up",
        cameraMovement: isOdd ? "Slow Dolly In" : "Smooth Tracking Pan",
        lighting: `${mood} lighting, subtle rim light`,
        imagePrompt: `Single frame cinematic shot, ${style}, ${charLock}, ${idea}, scene ${num} ${beat}, ${mood} lighting, single scene only, no collage`,
        videoPrompt: `Smooth ${perSceneSec}s motion, ${isOdd ? "slow dolly in" : "smooth pan"}, ${mood} atmosphere`,
        negativePrompt: "collage, split screen, grid, watermark, text, blurry, extra limbs",
        narration: narrationMode === "off" ? "" : `${beat} untuk ${title}: ${idea}.`,
        dialogue: dialogueMode === "off" ? "" : `${char.name || "Tokoh Utama"}: "Kita lanjutkan langkah ini."`,
        soundEffect: "Ambient cinematic atmosphere",
        imageStatus: "Waiting",
        videoStatus: "Waiting",
        imageUrl: "",
        videoUrl: ""
      };
    });

    return res.status(200).json({
      ok: true,
      title,
      hook: `Pembuka sinematik untuk ${title}`,
      synopsis: idea,
      conflict: `Tantangan utama dalam ${title}`,
      climax: `Puncak ketegangan pada adegan ke-${Math.max(1, Math.ceil(sceneCount * 0.7))}`,
      ending: `Penutup utuh dari ${title}`,
      message: "Konsistensi visi dan keberanian melangkah.",
      scenes
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || "Gagal membuat naskah storytelling" });
  }
}
