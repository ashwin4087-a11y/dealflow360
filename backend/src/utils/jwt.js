import jwt from "jsonwebtoken";

const DEFAULT_JWT_SECRET = "dealflow360-dev-secret";

const getJwtSecret = () => process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });

export const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret());
