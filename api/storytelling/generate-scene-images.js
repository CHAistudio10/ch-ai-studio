export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const scene = body.scene || {};
    const prompt = String(scene.imagePrompt || scene.description || "").trim();
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Prompt gambar scene kosong" });
    }

    // Kembalikan status terstruktur agar tidak pernah crash 500 di serverless Vercel
    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: "Provider gambar Storytelling belum dikonfigurasi pada environment ini."
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: err?.message || "Gagal memproses permintaan gambar scene"
    });
  }
}
