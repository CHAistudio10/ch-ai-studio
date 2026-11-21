const DEAPI_API = "https://api.deapi.ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const scene = body.scene || {};
    if (!scene.imageUrl) {
      return res.status(400).json({ ok: false, error: "Gambar scene wajib ada sebelum generate video" });
    }
    if (!process.env.DEAPI_API_KEY) {
      return res.status(200).json({ ok: false, status: "Failed", error: "DEAPI_API_KEY belum dikonfigurasi." });
    }

    let imageBuffer;
    if (scene.imageUrl.startsWith("data:image/")) {
      const b64 = scene.imageUrl.replace(/^data:image\/[^;]+;base64,/, "");
      imageBuffer = Buffer.from(b64, "base64");
    } else {
      const imgResp = await fetch(scene.imageUrl);
      if (!imgResp.ok) {
        return res.status(200).json({ ok: false, status: "Failed", error: "Gagal mengunduh gambar scene untuk video." });
      }
      const arrBuf = await imgResp.arrayBuffer();
      imageBuffer = Buffer.from(arrBuf);
    }

    const prompt = String(scene.videoPrompt || scene.action || scene.description || "Smooth cinematic motion").trim();

    const form = new FormData();
    form.append("first_frame_image", new Blob([imageBuffer], { type: "image/jpeg" }), "scene.jpg");
    form.append("model", "Ltx2_3_22B_Dist_INT8");
    form.append("prompt", prompt);
    form.append("width", "512");
    form.append("height", "512");
    form.append("frames", "241");
    form.append("fps", "24");
    form.append("seed", "42");

    const response = await fetch(DEAPI_API + "/api/v2/videos/animations", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.DEAPI_API_KEY,
        Accept: "application/json"
      },
      body: form
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(200).json({ ok: false, status: "Failed", error: "Respons deAPI bukan JSON: " + raw.slice(0, 200) });
    }

    if (!response.ok || !data?.data?.request_id) {
      return res.status(200).json({
        ok: false,
        status: "Failed",
        error: data?.message || data?.error || data?.detail || "deAPI gagal membuat video scene."
      });
    }

    const requestId = data.data.request_id;
    return res.status(200).json({
      ok: true,
      status: "Processing",
      requestId,
      taskId: requestId,
      pollingUrl: "/api/storytelling/generation-status?taskId=" + encodeURIComponent(requestId)
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: err?.message || "Gagal memproses video scene"
    });
  }
}
