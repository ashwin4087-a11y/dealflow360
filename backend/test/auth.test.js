import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { requireAuth, requireRole } from "../src/middleware/authMiddleware.js";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";

const passwordHash = await bcrypt.hash("correct-password", 4);
const user = {
  id: "user-1",
  name: "Salesperson",
  email: "sales@example.com",
  passwordHash,
  role: "SALESPERSON",
};

const prismaMock = {
  user: {
    findUnique: async ({ where }) => (where.email === user.email ? user : null),
  },
};

let server;
let baseUrl;

const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);

before(async () => {
  const app = createApp(prismaMock);
  const protectedApp = express();
  protectedApp.use(express.json());
  protectedApp.get("/protected", requireAuth(), (_req, res) =>
    res.json({ success: true }),
  );
  protectedApp.get(
    "/sales-only",
    requireAuth(),
    requireRole("SALES"),
    (_req, res) => {
      res.json({ success: true });
    },
  );
  app.use(protectedApp);

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const login = (body) =>
  request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("JWT authentication", () => {
  it("returns a JWT and sanitized user for valid credentials", async () => {
    const response = await login({
      email: user.email,
      password: "correct-password",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(typeof body.token, "string");
    assert.deepEqual(body.user, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    assert.equal("passwordHash" in body.user, false);
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.sub, user.id);
    assert.equal(claims.role, user.role);
    assert.equal(typeof claims.iat, "number");
    assert.equal(typeof claims.exp, "number");
  });

  it("rejects wrong passwords and unknown users identically", async () => {
    const wrongPassword = await login({
      email: user.email,
      password: "wrong-password",
    });
    const unknownUser = await login({
      email: "unknown@example.com",
      password: "wrong-password",
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.deepEqual(await wrongPassword.json(), await unknownUser.json());
  });

  it("rejects missing credentials", async () => {
    const response = await login({ email: user.email });
    assert.equal(response.status, 400);
  });
});

describe("authentication and role middleware", () => {
  it("rejects missing and invalid authorization headers", async () => {
    const missing = await request("/protected");
    const invalid = await request("/protected", {
      headers: { authorization: "Bearer invalid-token" },
    });

    assert.equal(missing.status, 401);
    assert.equal(invalid.status, 401);
  });

  it("accepts a valid JWT and supports the SALES role alias", async () => {
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
    );
    const protectedResponse = await request("/protected", {
      headers: { authorization: `Bearer ${token}` },
    });
    const salesResponse = await request("/sales-only", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(protectedResponse.status, 200);
    assert.equal(salesResponse.status, 200);
  });

  it("rejects an expired JWT and an incorrect role", async () => {
    const expiredToken = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: -1 },
    );
    const managerToken = jwt.sign(
      { sub: user.id, role: "MANAGER" },
      process.env.JWT_SECRET,
    );
    const expiredResponse = await request("/protected", {
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const managerResponse = await request("/sales-only", {
      headers: { authorization: `Bearer ${managerToken}` },
    });

    assert.equal(expiredResponse.status, 401);
    assert.equal(managerResponse.status, 403);
  });
});
