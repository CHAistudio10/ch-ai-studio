import { verifyToken } from "@clerk/backend";

async function resolveAuthUser(req) {
  const authHeader = req.headers?.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token && process.env.CLERK_SECRET_KEY) {
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      if (payload?.sub) return payload.sub;
    } catch (_) {}
  }
  if (req.headers?.["x-clerk-user-id"]) return String(req.headers["x-clerk-user-id"]);
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const userId = await resolveAuthUser(req);
    const { scene, ratio, style } = req.body || {};
    if (!scene || !scene.imagePrompt) {
      return res.status(400).json({ error: "Scene dan imagePrompt wajib ada" });
    }

    // Delegasikan ke endpoint /api/generate yang sudah berjalan di aplikasi jika tersedia
    const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost:3000"}`;
    const forwardHeaders = { "Content-Type": "application/json" };
    if (req.headers.authorization) forwardHeaders.Authorization = req.headers.authorization;
    if (userId) forwardHeaders["x-clerk-user-id"] = userId;

    const genRes = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({
        prompt: scene.imagePrompt,
        negativePrompt: scene.negativePrompt || "collage, split screen, grid, watermark",
        aspectRatio: ratio || "9:16",
        style: style || "cinematic",
        count: 1,
        source: "storytelling"
      })
    });

    if (genRes.ok) {
      const data = await genRes.json();
      const imageUrl =
        data.imageUrl ||
        data.url ||
        (Array.isArray(data.images) && (data.images[0]?.url || data.images[0])) ||
        (Array.isArray(data.results) && (data.results[0]?.url || data.results[0])) ||
        "";
      if (imageUrl) {
        return res.status(200).json({ ok: true, imageUrl, status: "Completed" });
      }
    }

    return res.status(502).json({
      error: "Provider gambar belum mengembalikan URL gambar untuk scene ini."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal menghasilkan gambar scene" });
  }
}
