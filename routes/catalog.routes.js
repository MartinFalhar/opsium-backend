import express from "express";
import {
  searchForCL,
  searchForLens,
  searchForSoldrops,
  searchForServices,
} from "../controllers/catalog.controller.js";

const router = express.Router();

router.post("/clsearch", searchForCL);

router.post("/lenssearch", searchForLens);

router.post("/soldrops-search", searchForSoldrops);

router.post("/services-search", searchForServices);



export default router;
