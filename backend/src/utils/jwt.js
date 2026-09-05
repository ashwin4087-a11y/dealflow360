import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });

export const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret());
