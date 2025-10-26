import express from "express";
import { saveOptotyp, loadOptotyp } from "../controllers/users.controller.js";

const router = express.Router();

router.post("/saveoptotyp", saveOptotyp);

router.post("/loadoptotyp", loadOptotyp);

export default router;
