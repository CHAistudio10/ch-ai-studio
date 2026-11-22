import { generateAffiliateStoryboard, regenerateSingleSceneText } from "./gemini-adapter.js";

export function registerAffiliateStoryboardRoute(app, { getClerkUserId, supabase }) {
  const STORYBOARD_COST = 0;

  app.post("/api/affiliate-tiktok/storyboard", async (req, res) => {
    try {
      let clerkUserId = await getClerkUserId(req);
      const isLocalDev = !process.env.VERCEL;
      if (!clerkUserId && isLocalDev) {
        clerkUserId = "local_dev_cahya";
      }
      if (!clerkUserId) {
        return res.status(401).json({ error: "Login diperlukan untuk menggunakan CH AI Affiliate TikTok Go." });
      }

      const { action } = req.body || {};

      // Regenerasi teks 1 frame saja (tanpa memotong kredit pembuatan storyboard penuh)
      if (action === "regenerate_text") {
        const text = await regenerateSingleSceneText({
          prompt: req.body.prompt || "",
          currentSceneText: req.body.currentSceneText || "",
          sceneContext: req.body.sceneContext || "",
          isLastScene: Boolean(req.body.isLastScene),
          ctaType: req.body.ctaType === "location" ? "location" : "product"
        });
        return res.json({ text });
      }

      const { prompt, imagesBase64, duration, beatTimestamps, hasMusic } = req.body || {};
      if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ error: "Konsep video (prompt) wajib diisi." });
      }
      if (!Array.isArray(imagesBase64) || imagesBase64.length < 5 || imagesBase64.length > 10) {
        return res.status(400).json({ error: "Unggah minimal 5 foto dan maksimal 10 foto." });
      }

      const targetDuration = Number(duration) === 30 ? 30 : 20;

      // Cek saldo kredit terlebih dahulu (JANGAN potong sebelum AI sukses)
      if (supabase && clerkUserId !== "local_dev_cahya") {
        const { data: currentCredits, error: credErr } = await supabase.rpc("get_or_create_user_credits", {
          p_clerk_user_id: clerkUserId
        });
        if (credErr) throw credErr;
        if (Number(currentCredits ?? 0) < STORYBOARD_COST) {
          return res.status(402).json({ error: `Credit tidak mencukupi (butuh ${STORYBOARD_COST} credit).` });
        }
      }

      // Jalankan Gemini via Adapter CH Chat AI
      const storyboard = await generateAffiliateStoryboard({
        prompt: String(prompt).trim(),
        imagesBase64,
        duration: targetDuration,
        beatTimestamps: Array.isArray(beatTimestamps) ? beatTimestamps : [],
        hasMusic: Boolean(hasMusic)
      });

      // Potong kredit HANYA setelah Gemini sukses menghasilkan storyboard valid
      let remainingCredits = null;
      if (supabase && clerkUserId !== "local_dev_cahya") {
        const { data: useData, error: useErr } = await supabase.rpc("use_user_credit", {
          p_clerk_user_id: clerkUserId,
          p_cost: STORYBOARD_COST
        });
        if (useErr) throw useErr;
        const result = Array.isArray(useData) ? useData[0] : useData;
        remainingCredits = Number(result?.credits ?? 0);
      }

      return res.json({
        storyboard,
        creditsUsed: STORYBOARD_COST,
        credits: remainingCredits
      });
    } catch (error) {
      console.error("[AffiliateTikTok Storyboard Error]:", error);
      return res.status(500).json({ error: error?.message || "Gagal menyusun storyboard AI." });
    }
  });
}
