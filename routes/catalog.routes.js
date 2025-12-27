import express from "express";
import {
  searchForCL,
  searchForLens
} from "../controllers/catalog.controller.js";

const router = express.Router();

router.post("/clsearch", searchForCL);

router.post("/lenssearch", searchForLens);

export default router;
