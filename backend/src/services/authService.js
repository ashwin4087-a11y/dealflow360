import bcrypt from "bcryptjs";
import { signAccessToken } from "../utils/jwt.js";

const invalidCredentialsError = () => {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return error;
};

export const loginUser = async (prismaClient, { email, password }) => {
  const user = await prismaClient.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (
    !user ||
    !user.passwordHash ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    throw invalidCredentialsError();
  }

  return {
    token: signAccessToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
