export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const scene = body.scene || {};
    const ratio = String(body.ratio || "9:16");
    const style = String(body.style || "Photorealistic Cinema");
    const rawPrompt = String(scene.imagePrompt || scene.description || "").trim();

    if (!rawPrompt) {
      return res.status(400).json({ ok: false, error: "Prompt gambar scene kosong" });
    }
    if (!process.env.PIXAZO_API_KEY) {
      return res.status(200).json({ ok: false, status: "Failed", error: "PIXAZO_API_KEY belum dikonfigurasi." });
    }

    let width = 576;
    let height = 1024;
    if (ratio === "1:1") {
      width = 640;
      height = 640;
    } else if (ratio === "16:9") {
      width = 1024;
      height = 576;
    }

    const finalPrompt = `${rawPrompt}. Style: ${style}. Single cinematic frame, high detail, clean composition, no text, no watermark, no collage.`;

    const response = await fetch("https://gateway.pixazo.ai/flux-1-schnell/v1/getData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": process.env.PIXAZO_API_KEY
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        num_steps: 8,
        num_frames: 240,
        frame_rate: 24,
        width,
        height
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        ok: false,
        status: "Failed",
        error: `Pixazo gagal (${response.status}): ${errText.slice(0, 200)}`
      });
    }

    const data = await response.json();
    const imageUrl = data?.output || data?.image_url || data?.url || data?.output?.media_url?.[0];

    if (!imageUrl) {
      return res.status(200).json({
        ok: false,
        status: "Failed",
        error: "Pixazo tidak mengembalikan URL gambar scene."
      });
    }

    return res.status(200).json({
      ok: true,
      status: "Completed",
      imageUrl,
      model: "Pixazo Flux Schnell"
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: err?.message || "Gagal memproses gambar scene"
    });
  }
}
