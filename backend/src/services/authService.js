import bcrypt from "bcryptjs";
import { signAccessToken } from "../utils/jwt.js";

const DEMO_USERS = {
  "sales@dealflow360.com": { id: "demo-sales", name: "Sales Demo", email: "sales@dealflow360.com", role: "SALESPERSON", password: "demo123" },
  "manager@dealflow360.com": { id: "demo-manager", name: "Manager Demo", email: "manager@dealflow360.com", role: "MANAGER", password: "demo123" },
  "customer@dealflow360.com": { id: "demo-customer", name: "Customer Demo", email: "customer@dealflow360.com", role: "CUSTOMER", password: "demo123" },
};

const invalidCredentialsError = () => {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return error;
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const buildDemoUserResponse = (user) => ({
  token: signAccessToken(user),
  user: sanitizeUser(user),
});

export const loginUser = async (prismaClient, { email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  try {
    const user = await prismaClient.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.passwordHash && (await bcrypt.compare(normalizedPassword, user.passwordHash))) {
      return {
        token: signAccessToken(user),
        user: sanitizeUser(user),
      };
    }
  } catch (_error) {
    // Fall through to the local demo credentials below when the database is not configured.
  }

  const demoUser = DEMO_USERS[normalizedEmail];
  if (demoUser && demoUser.password === normalizedPassword) {
    return buildDemoUserResponse(demoUser);
  }

  throw invalidCredentialsError();
};
