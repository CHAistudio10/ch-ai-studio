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
    const { scene, ratio } = req.body || {};
    if (!scene || !scene.imageUrl) {
      return res.status(400).json({ error: "Gambar scene wajib tersedia sebelum generate video" });
    }

    // Gunakan endpoint /api/generate-video yang sudah ada secara terisolasi tanpa mengubahnya
    const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost:3000"}`;
    const forwardHeaders = { "Content-Type": "application/json" };
    if (req.headers.authorization) forwardHeaders.Authorization = req.headers.authorization;
    if (userId) forwardHeaders["x-clerk-user-id"] = userId;

    const vidRes = await fetch(`${origin}/api/generate-video`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({
        prompt: scene.videoPrompt || scene.imagePrompt,
        imageUrl: scene.imageUrl,
        aspectRatio: ratio || "9:16",
        duration: Number(scene.duration) || 6,
        source: "storytelling"
      })
    });

    const data = await vidRes.json().catch(() => ({}));
    if (!vidRes.ok) {
      return res.status(vidRes.status || 502).json({
        error: data.error || "Gagal mengirim scene ke DeAPI video generator"
      });
    }

    const videoUrl =
      data.videoUrl ||
      data.url ||
      data.outputUrl ||
      (Array.isArray(data.videos) && (data.videos[0]?.url || data.videos[0])) ||
      "";
    const taskId = data.taskId || data.jobId || data.id || null;

    return res.status(200).json({
      ok: true,
      taskId,
      videoUrl,
      status: videoUrl ? "Completed" : "Processing",
      targetDuration: Number(scene.duration) || 6
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal memproses video scene" });
  }
}
