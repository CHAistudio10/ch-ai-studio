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

    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: "Antrean DeAPI Storytelling belum dihubungkan pada environment ini."
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: "Failed",
      error: err?.message || "Gagal memproses video scene"
    });
  }
}
