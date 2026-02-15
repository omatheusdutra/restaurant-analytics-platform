import request from "supertest";
import app from "../index";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("Auth Controller", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test${Date.now()}@example.com`,
          password: "Test123!@#",
          name: "Test User",
        });

      expect([200,201]).toContain(response.status);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("email");
      expect(response.body.user).toHaveProperty("name");
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should fail with invalid email", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "invalid-email",
        password: "Test123!@#",
        name: "Test User",
      });

      expect(response.status).toBe(400);
    });

    it("should fail with short password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test${Date.now()}@example.com`,
          password: "123",
          name: "Test User",
        });

      expect(response.status).toBe(400);
    });

    it("should fail with missing name", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `test${Date.now()}@example.com`,
          password: "Test123!@#",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    let loginEmail = `login-${Date.now()}@example.com`;
    beforeAll(async () => {
      await request(app).post("/api/auth/register").send({
        email: loginEmail,
        password: "Test123!@#",
        name: "Login Test User",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: loginEmail,
        password: "Test123!@#",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(loginEmail);
    });

    it("should fail with incorrect password", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: loginEmail,
        password: "WrongPassword123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should fail with non-existent user", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "Test123!@#",
      });

      expect(response.status).toBe(401);
    });

    it("should fail with missing credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/auth/profile", () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: `profile${Date.now()}@example.com`,
          password: "Test123!@#",
          name: "Profile Test User",
        });
      authToken = response.body.token;
    });

    it("should get user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("email");
      expect(response.body).toHaveProperty("name");
      expect(response.body).not.toHaveProperty("password");
    });

    it("should fail without authorization header", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
    });

    it("should fail with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});


