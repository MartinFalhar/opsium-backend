import express from "express";
import {
  loadClients,
  createClient,
  saveExamination,
} from "../controllers/client.controller.js";

const router = express.Router();

router.post("/create_client", createClient);

router.post("/clients_list", loadClients);

router.post("/save_examination", saveExamination);

export default router;
