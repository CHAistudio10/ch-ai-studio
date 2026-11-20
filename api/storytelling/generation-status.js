export default async function handler(req, res) {
  try {
    const taskId = req.query?.taskId || req.body?.taskId || null;
    if (!taskId) {
      return res.status(400).json({ ok: false, error: "taskId diperlukan" });
    }
    return res.status(200).json({ ok: true, taskId, status: "Waiting" });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || "Status tidak tersedia" });
  }
}
