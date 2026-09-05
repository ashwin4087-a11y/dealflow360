import { verifyAccessToken } from "../utils/jwt.js";

export const requireAuth = () => (req, res, next) => {
  const authorization = req.get("authorization");
  const tokenMatch = /^Bearer\s+(\S+)$/.exec(authorization || "");

  if (!tokenMatch) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }

  try {
    const payload = verifyAccessToken(tokenMatch[1]);
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new Error("Invalid token claims");
    }

    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }
};

export const requireRole = (...allowedRoles) => {
  const normalizedRoles = new Set(
    allowedRoles.map((role) => (role === "SALES" ? "SALESPERSON" : role)),
  );

  return (req, res, next) => {
    if (!req.user || !normalizedRoles.has(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, error: "Insufficient permissions" });
    }

    return next();
  };
};
