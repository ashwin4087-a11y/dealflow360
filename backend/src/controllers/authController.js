import { loginUser } from "../services/authService.js";

export const createAuthController = (prismaClient) => ({
  login: async (req, res, next) => {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    try {
      const result = await loginUser(prismaClient, {
        email: email.trim(),
        password,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      return next(error);
    }
  },
});
