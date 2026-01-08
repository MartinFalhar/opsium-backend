import express from "express";
import {
  searchForCL,
  searchForLens,
  searchForSoldrops,

} from "../controllers/catalog.controller.js";

const router = express.Router();

router.post("/clsearch", searchForCL);

router.post("/lenssearch", searchForLens);

router.post("/soldrops-search", searchForSoldrops);

export default router;
