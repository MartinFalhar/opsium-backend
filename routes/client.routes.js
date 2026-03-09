import express from "express";
import {
  loadClients,
  createClient,
  saveExamination,
  loadExamsList,
  loadExamination,
  findClientBySurname,
  analyzeOptometryAnamnesis,
} from "../controllers/client.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create_client", authenticateToken, createClient);

router.post("/clients_list", authenticateToken, loadClients);

router.post("/save_examination", authenticateToken, saveExamination);

router.post("/load_exams_list", authenticateToken, loadExamsList);

router.post("/load_examination", authenticateToken, loadExamination);

router.post("/find_client", authenticateToken, findClientBySurname);

router.post(
  "/analyze_optometry_anamnesis_ai",
  authenticateToken,
  analyzeOptometryAnamnesis,
);

export default router;
