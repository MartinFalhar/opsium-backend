import express from "express";
import { saveOptotyp, loadOptotyp } from "../controllers/optotyp.controller.js";

const router = express.Router();

router.post("/saveoptotyp", saveOptotyp);

router.post("/loadoptotyp", loadOptotyp);

export default router;
