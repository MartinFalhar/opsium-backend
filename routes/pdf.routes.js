import express from "express";
import { pdfInvoice } from "../controllers/pdf.controller.js";
import { pdfOrder } from "../controllers/pdf.controller.js";

const router = express.Router();

router.get("/invoice/:id", pdfInvoice);
router.get("/order/:id", pdfOrder);

export default router;
