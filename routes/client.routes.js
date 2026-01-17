import express from "express";
import {
  loadClients,
  createClient,
  saveExamination,
  loadExamsList,
  loadExamination,
} from "../controllers/client.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create_client", authenticateToken, createClient);

router.post("/clients_list", authenticateToken, loadClients);

router.post("/save_examination", authenticateToken, saveExamination);

router.post("/load_exams_list", authenticateToken, loadExamsList);

router.post("/load_examination", authenticateToken, loadExamination);

export default router;
