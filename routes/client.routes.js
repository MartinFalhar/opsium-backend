import express from "express";
import { loadClients, createClient } from "../controllers/client.controller.js";

const router = express.Router();

router.post("/create_client", createClient);

router.post("/clients", loadClients);

export default router;