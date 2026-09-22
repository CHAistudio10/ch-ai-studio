const DEAPI_API = "https://api.deapi.ai";

app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, image_b64 = "", seed = 42 } = req.body || {};

    if (!prompt?.trim())
      return res.status(400).json({ error: "Prompt video wajib diisi." });

    if (!image_b64)
      return res.status(400).json({ error: "Gambar wajib diisi untuk video I2V." });

    if (!process.env.DEAPI_API_KEY)
      return res.status(500).json({ error: "DEAPI_API_KEY belum dikonfigurasi." });

    const base64 = image_b64.replace(/^data:image\/[^;]+;base64,/, "");
    const imageBuffer = Buffer.from(base64, "base64");

    if (!imageBuffer.length)
      return res.status(400).json({ error: "Data gambar tidak valid." });

    const form = new FormData();

    form.append(
      "first_frame_image",
      new Blob([imageBuffer], { type: "image/jpeg" }),
      "input.jpg"
    );

    form.append("model", "Ltx2_3_22B_Dist_INT8");
    form.append("prompt", prompt.trim());
    form.append("width", "512");
    form.append("height", "512");
    form.append("frames", "49");
    form.append("fps", "24");
    form.append("seed", String(Number(seed) || 42));

    const response = await fetch(
      DEAPI_API + "/api/v2/videos/animations",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.DEAPI_API_KEY,
          Accept: "application/json"
        },
        body: form
      }
    );

    const data = await response.json();

    console.log("DEAPI VIDEO CREATE:", data);

    if (!response.ok || !data?.data?.request_id)
      throw new Error(data?.message || data?.error || "deAPI gagal membuat video.");

    const requestId = data.data.request_id;

    res.status(202).json({
      ok: true,
      requestId,
      status: "PROCESSING",
      pollingUrl: "/api/video-status?requestId=" + encodeURIComponent(requestId),
      model: "Ltx2_3_22B_Dist_INT8"
    });

  } catch (err) {
    console.error("DEAPI VIDEO ERROR:", err);
    res.status(500).json({ error: err?.message || "Gagal membuat video." });
  }
});

app.post("/api/video-status", async (req, res) => {
  try {
    let requestId = req.body?.requestId || req.body?.eventId;

    if (!requestId && req.body?.pollingUrl) {
      const url = new URL(req.body.pollingUrl, "http://localhost");
      requestId = url.searchParams.get("requestId");
    }

    if (!requestId)
      return res.status(400).json({ error: "Request ID tidak ditemukan." });

    const response = await fetch(
      DEAPI_API + "/api/v2/jobs/" + encodeURIComponent(requestId),
      {
        headers: {
          Authorization: "Bearer " + process.env.DEAPI_API_KEY,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    console.log("DEAPI VIDEO STATUS:", data);

    if (!response.ok)
      throw new Error(data?.message || "Gagal mengambil status video deAPI.");

    const job = data?.data;

    if (job?.status === "done") {
      return res.json({
        status: "COMPLETED",
        output: { media_url: job.result_url }
      });
    }

    if (job?.status === "failed" || job?.error_code || job?.error_reason) {
      return res.json({
        status: "FAILED",
        error: job.error_reason || "Video gagal dibuat."
      });
    }

    res.json({
      status: "PROCESSING",
      progress: job?.progress ?? 0
    });

  } catch (err) {
    console.error("DEAPI VIDEO STATUS ERROR:", err);
    res.status(500).json({
      error: err?.message || "Gagal mengecek status video."
    });
  }
});