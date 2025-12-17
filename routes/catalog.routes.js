import express from "express";
import {
  searchForCL
} from "../controllers/catalog.controller.js";

const router = express.Router();

router.post("/clsearch", searchForCL);

export default router;
