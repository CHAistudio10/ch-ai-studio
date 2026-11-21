const DEAPI_API = "https://api.deapi.ai";

export default async function handler(req, res) {
  try {
    const taskId = req.query?.taskId || req.body?.taskId || req.query?.requestId || req.body?.requestId || null;
    if (!taskId) {
      return res.status(400).json({ ok: false, error: "taskId diperlukan" });
    }
    if (!process.env.DEAPI_API_KEY) {
      return res.status(200).json({ ok: false, taskId, status: "Failed", error: "DEAPI_API_KEY belum dikonfigurasi." });
    }

    const response = await fetch(DEAPI_API + "/api/v2/jobs/" + encodeURIComponent(taskId), {
      headers: {
        Authorization: "Bearer " + process.env.DEAPI_API_KEY,
        Accept: "application/json"
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        taskId,
        status: "Failed",
        error: data?.message || "Gagal mengambil status video deAPI."
      });
    }

    const job = data?.data;
    if (job?.status === "done" && job?.result_url) {
      return res.status(200).json({
        ok: true,
        taskId,
        status: "Completed",
        videoUrl: job.result_url
      });
    }

    if (job?.status === "failed" || job?.error_code || job?.error_reason) {
      return res.status(200).json({
        ok: false,
        taskId,
        status: "Failed",
        error: job.error_reason || "Video scene gagal dibuat."
      });
    }

    return res.status(200).json({
      ok: true,
      taskId,
      status: "Processing",
      progress: job?.progress ?? 0
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || "Status tidak tersedia" });
  }
}
