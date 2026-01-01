import express from "express";
import { sendEmail } from "../controllers/email.controller.js";


const router = express.Router();

// router.post("/create_client", createClient);

router.post("/send", sendEmail);




export default router;