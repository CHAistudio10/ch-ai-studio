import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: true,
    provider: "Pollinations"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, ratio = "9:16" } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt wajib diisi."
      });
    }

    const finalPrompt =
      `${prompt.trim()}. ` +
      `Create a high quality detailed AI image, suitable for social media.`;

    const url =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(finalPrompt);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`AI gagal membuat gambar (${response.status}).`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.json({
      ok: true,
      image: "data:image/jpeg;base64," + buffer.toString("base64"),
      model: "Pollinations AI",
      ratio
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err?.message || "AI gagal membuat gambar."
    });
  }
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`CH AI Studio berjalan di http://localhost:${PORT}`);
  });
}

export default app;
