import express from "express";
import { pdfInvoice } from "../controllers/pdf.controller.js";


const router = express.Router();


router.get("/invoice/:id", pdfInvoice);


export default router;