import express from "express";
import {
  loadClients,
  createClient,
  saveExamination,
  loadExamsList,
  loadExamination,
} from "../controllers/client.controller.js";

const router = express.Router();

router.post("/create_client", createClient);

router.post("/clients_list", loadClients);

router.post("/save_examination", saveExamination);

router.post("/load_exams_list", loadExamsList);

router.post("/load_examination", loadExamination);

export default router;
