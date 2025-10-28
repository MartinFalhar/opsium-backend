import express from "express";
import { 
  heroImgInfo,
  heroImg,
  loginPage,
  indexPage,
  loginUser
} from "../controllers/page.controller.js";

const router = express.Router();

router.get("/hero_img/:id", heroImg);

router.post("/hero_img_info", heroImgInfo);


router.post("/login", loginUser);

//BACKEND routes
router.get("/", loginPage); //backend

router.get("/index", indexPage); //backend

export default router;