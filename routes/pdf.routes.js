import express from "express";
import { pdfInvoice } from "../controllers/pdf.controller.js";
import { pdfOrder } from "../controllers/pdf.controller.js";
import { pdfExam } from "../controllers/pdf.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/invoice/:id", pdfInvoice);
router.get("/order/:id", pdfOrder);
router.post("/exam", authenticateToken, pdfExam);

export default router;
