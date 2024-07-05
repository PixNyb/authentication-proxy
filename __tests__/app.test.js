// tests/app.test.js
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app, server } = require("../app");

jest.mock("jsonwebtoken");

describe("Authentication Proxy Tests", () => {
  describe("Application Routes", () => {
    it("should return OK for the health check route", async () => {
      const response = await request(app).get("/healthz");
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe("OK");
    });

    it("should redirect unauthenticated users to login", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });
      const response = await request(app).get("/");
      expect(response.statusCode).toBe(302);
    });
  });
});

afterAll(() => {
  server.close();
});
