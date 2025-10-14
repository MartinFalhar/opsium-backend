import express from "express";
import {
  loginPage,
  loginUser,
  heroImgInfo,
  heroImg,
  indexPage,
  registerUser,
  saveOptotyp,
  loadOptotyp,
  loadClients,
} from "../controllers/users.controller.js";

const router = express.Router();

router.get("/", loginPage);

router.get("/index", indexPage);

router.get("/hero_img/:id", heroImg);

router.post("/login", loginUser);

router.post("/hero_img_info", heroImgInfo);

router.post("/register", registerUser);

router.post("/saveoptotyp", saveOptotyp);

router.post("/loadoptotyp", loadOptotyp);

router.post("/clients", loadClients);

export default router;
