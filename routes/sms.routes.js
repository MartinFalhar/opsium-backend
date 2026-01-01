import express from "express";
import { sendSMS } from "../controllers/sms.controller.js";


const router = express.Router();

// router.post("/create_client", createClient);

// router.post("/send", sendSMS);

router.post("/send", async (req, res) => {
  const { phone, text } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ error: "Chybí telefon nebo text" });
  }

  try {
    const result = await sendSMS(phone, text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "SMS se nepodařilo odeslat" });
  }
});


export default router;