import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  registerValidation,
  loginValidation,
  updateProfile,
  updateProfileValidation,
  changePassword,
  changePasswordValidation,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/logout", authMiddleware, logout);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfileValidation, updateProfile);
router.post("/change-password", authMiddleware, changePasswordValidation, changePassword);

export default router;
