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
    const beats = [
      "Hook Pembuka",
      "Pengenalan Konflik",
      "Eskalasi Ketegangan",
      "Klimaks",
      "Resolusi & Pesan"
    ];

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
      climax: `Puncak ketegangan pada adegan ke-${Math.max(1, sceneCount - 1)}`,
      ending: `Penutup utuh dari ${title}`,
      message: "Konsistensi visi dan keberanian melangkah.",
      scenes
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err?.message || "Gagal membuat naskah cerita"
    });
  }
}
