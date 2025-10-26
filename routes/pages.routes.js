import express from "express";
import { heroImgInfo,
  heroImg } from "../controllers/users.controller.js";

const router = express.Router();

router.get("/hero_img/:id", heroImg);

router.post("/hero_img_info", heroImgInfo);

export default router;