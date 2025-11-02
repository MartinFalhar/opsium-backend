import express from "express";
import { searchInStore } from "../controllers/store.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/search", searchInStore);

export default router;