import crypto from "crypto";
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: true,
    provider: "Pollinations"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, ratio = "9:16", model = "CH Image Demo", resolution = "1K", count = 1 } = req.body || {};

    const sizeMap = {
      "1K": { short: 640, long: 1024 },
      "2K": { short: 1024, long: 1536 }
    };

    const size = sizeMap[resolution] || sizeMap["1K"];
    let width, height;

    if (ratio === "1:1") {
      width = size.short;
      height = size.short;
    } else if (ratio === "16:9") {
      width = size.long;
      height = Math.round(size.long * 9 / 16);
    } else {
      width = Math.round(size.long * 9 / 16);
      height = size.long;
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt wajib diisi."
      });
    }

    const finalPrompt =
      `USER REQUEST: ${prompt.trim()}. Follow the user request exactly. Preserve the main subject, clothing, pose, location, objects, colors, text, and composition requested by the user. Do not add unrelated subjects or objects. Generate only what is requested. Style/model: ${model}. Aspect ratio: ${ratio}. Resolution target: ${resolution}. High detail, accurate composition, professional lighting, clean image.`;

    const results = [];
    const total = Math.min(Math.max(Number(count) || 1, 1), 2);

    for (let i = 0; i < total; i++) {
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
        const errorText = await response.text();
        throw new Error(`Pixazo gagal (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data?.output || data?.image_url || data?.url || data?.output?.media_url?.[0];

      if (!imageUrl) {
        throw new Error("Pixazo tidak mengembalikan URL gambar.");
      }

      results.push(imageUrl);
    }

    res.json({
      ok: true,
      image: results[0],
      images: results,
      count: results.length,
      model: "Pixazo Flux Schnell",
      ratio,
      resolution
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err?.message || "AI gagal membuat gambar."
    });
  }
});


// Global error handler. Vercel's native Express runtime turns the app into a single
// Function; an unhandled error can leave that Function in an undefined state, so we
// always convert errors into a clean JSON response instead of letting Express swallow them.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || "Terjadi kesalahan pada server." });
});

// Only bind a port when running locally. On Vercel the default export is used directly.


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
    form.append("frames", "241");
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

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("DEAPI VIDEO RAW RESPONSE:", responseText);
      throw new Error(
        "deAPI mengembalikan respons bukan JSON: " +
        responseText.slice(0, 500)
      );
    }

    console.log("DEAPI VIDEO CREATE:", data);

    if (!response.ok || !data?.data?.request_id) {
      throw new Error(
        data?.message ||
        data?.error ||
        data?.detail ||
        "deAPI gagal membuat video."
      );
    }

    const requestId = data.data.request_id;

    res.status(202).json({
      ok: true,
      requestId,
      status: "PROCESSING",
      pollingUrl: "/api/video-status?requestId=" +
        encodeURIComponent(requestId),
      model: "Ltx2_3_22B_Dist_INT8"
    });

  } catch (err) {
    console.error("DEAPI VIDEO ERROR:", err);
    res.status(500).json({
      error: err?.message || "Gagal membuat video."
    });
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

// 404 for unmatched API routes (static assets are served by Vercel's CDN from public/**)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`CH AI Studio berjalan di http://localhost:${PORT}`);
  });
}

export default app;
