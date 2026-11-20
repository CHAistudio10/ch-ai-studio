export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const taskId = req.query?.taskId || req.body?.taskId || null;
  if (!taskId) {
    return res.status(400).json({ error: "taskId diperlukan" });
  }
  try {
    const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost:3000"}`;
    const stRes = await fetch(`${origin}/api/video-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId })
    });
    const data = await stRes.json().catch(() => ({}));
    return res.status(stRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Gagal mengecek status generasi" });
  }
}
