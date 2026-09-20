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
    const { prompt, ratio = "9:16", model = "CH Image Demo", resolution = "1K" } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt wajib diisi."
      });
    }

    const finalPrompt =
      `USER REQUEST: ${prompt.trim()}. Follow the user request exactly. Preserve the main subject, clothing, pose, location, objects, colors, text, and composition requested by the user. Do not add unrelated subjects or objects. Generate only what is requested. Style/model: ${model}. Aspect ratio: ${ratio}. Resolution target: ${resolution}. High detail, accurate composition, professional lighting, clean image.`;

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
        width: 768,
        height: 1024
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

    res.json({
      ok: true,
      image: imageUrl,
      model: "Pixazo Flux Schnell",
      ratio
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err?.message || "AI gagal membuat gambar."
    });
  }
});

// 404 for unmatched API routes (static assets are served by Vercel's CDN from public/**)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
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


/* =========================
   WAN 2.2 I2V LIGHTNING VIDEO GENERATOR
========================= */

const WAN_LIGHTNING =
  "https://saravutw-wan2-2-i2v-lightning-4-8step-custom.hf.space";

app.post("/api/generate-video", async (req, res) => {
  try {
    const {
      prompt,
      image_b64 = "",
      duration = 3.5,
      steps = 4,
      negative_prompt =
        "blurry, low quality, chaotic, deformed, watermark, bad anatomy, shaky camera view point",
      guidance_scale = 1,
      guidance_scale_2 = 1,
      seed = 42,
      randomize_seed = true
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt video wajib diisi."
      });
    }

    if (!image_b64) {
      return res.status(400).json({
        error: "Gambar wajib diisi untuk video I2V."
      });
    }

    const base64 = image_b64.replace(
      /^data:image\/[^;]+;base64,/,
      ""
    );

    const imageBuffer = Buffer.from(base64, "base64");

    if (!imageBuffer.length) {
      return res.status(400).json({
        error: "Data gambar tidak valid."
      });
    }

    // UPLOAD GAMBAR
    const form = new FormData();

    form.append(
      "files",
      new Blob([imageBuffer], {
        type: "image/jpeg"
      }),
      "input.jpg"
    );

    const uploadResponse = await fetch(
      WAN_LIGHTNING + "/gradio_api/upload",
      {
        method: "POST",
        body: form
      }
    );

    const uploadText = await uploadResponse.text();

    console.log(
      "WAN2.2 LIGHTNING UPLOAD:",
      uploadText
    );

    if (!uploadResponse.ok) {
      throw new Error(
        "Gagal upload gambar ke WAN 2.2 Lightning."
      );
    }

    let uploadData;

    try {
      uploadData = JSON.parse(uploadText);
    } catch {
      throw new Error(
        "Response upload gambar tidak valid."
      );
    }

    const imagePath = Array.isArray(uploadData)
      ? uploadData[0]
      : uploadData?.path;

    if (!imagePath) {
      throw new Error(
        "Path gambar dari WAN 2.2 tidak ditemukan."
      );
    }

    // MULAI GENERATE VIDEO
    const videoResponse = await fetch(
      WAN_LIGHTNING +
        "/gradio_api/call/generate_video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: [
            {
              path: imagePath
            },
            null,
            prompt.trim(),
            Math.min(
              8,
              Math.max(4, Number(steps) || 4)
            ),
            negative_prompt,
            Math.min(
              10,
              Math.max(
                0.5,
                Number(duration) || 3.5
              )
            ),
            Number(guidance_scale) || 1,
            Number(guidance_scale_2) || 1,
            Number(seed) || 42,
            Boolean(randomize_seed),
            5,
            "UniPCMultistep",
            3.0,
            16,
            false,
            true
          ]
        })
      }
    );

    const data = await videoResponse.json();

    console.log(
      "WAN2.2 LIGHTNING CREATE:",
      data
    );

    if (!videoResponse.ok || !data?.event_id) {
      throw new Error(
        data?.error ||
          "WAN 2.2 Lightning gagal memulai video."
      );
    }

    res.status(202).json({
      ok: true,
      requestId: data.event_id,
      status: "PROCESSING",
      pollingUrl:
        "/api/video-status?eventId=" +
        encodeURIComponent(data.event_id),
      model: "WAN 2.2 I2V Lightning",
      duration:
        Number(duration) || 3.5
    });

  } catch (err) {
    console.error(
      "WAN2.2 LIGHTNING VIDEO ERROR:",
      err
    );

    res.status(500).json({
      error:
        err?.message ||
        "Gagal membuat video."
    });
  }
});


/* =========================
   WAN 2.2 VIDEO STATUS
========================= */

app.post("/api/video-status", async (req, res) => {
  try {
    let eventId = req.body?.eventId;

    if (!eventId && req.body?.pollingUrl) {
      const url = new URL(
        req.body.pollingUrl,
        "http://localhost"
      );

      eventId =
        url.searchParams.get("eventId");
    }

    if (!eventId) {
      return res.status(400).json({
        error: "Event ID tidak ditemukan."
      });
    }

    const response = await fetch(
      WAN_LIGHTNING +
        "/gradio_api/call/generate_video/" +
        encodeURIComponent(eventId)
    );

    if (!response.ok) {
      throw new Error(
        "Gagal mengambil status WAN 2.2 Lightning."
      );
    }

    const text = await response.text();

    console.log(
      "WAN2.2 LIGHTNING STATUS:",
      text
    );

    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;

      try {
        const result = JSON.parse(
          line.slice(5).trim()
        );

        if (Array.isArray(result)) {
          for (const item of result) {
            const url =
              typeof item === "string"
                ? item
                : item?.url;

            if (
              url &&
              /^https?:\/\//.test(url) &&
                /\.mp4/i.test(url)
            ) {
              return res.json({
                status: "COMPLETED",
                output: {
                  media_url: url
                }
              });
            }
          }
        }

        if (
          result &&
          typeof result === "object" &&
          result.error
        ) {
          return res.json({
            status: "FAILED",
            error: result.error
          });
        }

      } catch {}
    }

    res.json({
      status: "PROCESSING"
    });

  } catch (err) {
    console.error(
      "WAN2.2 LIGHTNING STATUS ERROR:",
      err
    );

    res.status(500).json({
      error:
        err?.message ||
        "Gagal mengecek status video."
    });
  }
});


if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`CH AI Studio berjalan di http://localhost:${PORT}`);
  });
}

export default app;
