const request = require("supertest");
const jwt = require("jsonwebtoken");
const { app, stop } = require("../app");
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  AUTH_HOST,
  LONG_LIVED_TOKENS,
  LONG_LIVED_TOKENS_NUMBER,
} = require("../src/config/constants");

const METHODS = ["get", "post", "put", "delete", "patch", "head", "options"];

describe("Authentication Proxy Tests", () => {
  describe("Application Routes", () => {
    it("should return OK for the health check route", async () => {
      const response = await request(app).get("/healthz");
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe("OK");
    });

    it("should allow authenticated users on all methods", async () => {
      const accessToken = jwt.sign({ user: "test" }, ACCESS_TOKEN_SECRET);
      const refreshToken = jwt.sign({ user: "test" }, REFRESH_TOKEN_SECRET);

      for (const method of METHODS) {
        const response = await request(app)
          // eslint-disable-next-line no-unexpected-multiline
          [method]("/")
          .set("Cookie", [
            `${ACCESS_TOKEN_NAME}=${accessToken}`,
            `${REFRESH_TOKEN_NAME}=${refreshToken}`,
          ]);

        expect(response.statusCode).toBe(200);
      }
    });

    it("should redirect expired access tokens to refresh", async () => {
      const refreshToken = jwt.sign({ user: "test" }, REFRESH_TOKEN_SECRET);

      const response = await request(app)
        .get("/")
        .set("Cookie", [`${REFRESH_TOKEN_NAME}=${refreshToken}`]);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain(`${AUTH_HOST}/refresh`);
    });

    it("should redirect unauthenticated users to login", async () => {
      const response = await request(app).get("/");
      expect(response.statusCode).toBe(302);
    });

    it("should return a 401 for all request that cannot be authenticated or properly redirected", async () => {
      for (const method of METHODS) {
        if (method === "get") continue;
        const response = await request(app)
          // eslint-disable-next-line no-unexpected-multiline
          [method]("/bad-route");

        expect(response.statusCode).toBe(401);
      }
    });

    it("should generate the appropriate amount of long lived tokens", async () => {
      expect(Object.keys(LONG_LIVED_TOKENS).length).toBe(
        LONG_LIVED_TOKENS_NUMBER
      );
    });

    it("should allow request with a long lived token parameter in the request query", async () => {
      const tokens = Object.values(LONG_LIVED_TOKENS);
      for (const token of tokens) {
        const queryResponse = await request(app).get("/bad-route?tkn=" + token);
        expect(queryResponse.statusCode).toBe(200);
      }
    });

    it("should allow request with a long lived token in the request body", async () => {
      const tokens = Object.values(LONG_LIVED_TOKENS);
      for (const token of tokens) {
        const response = await request(app)
          .post("/bad-route")
          .send({ token: token });
        expect(response.statusCode).toBe(200);
      }
    });

    it("should allow request with a long lived token in the request header", async () => {
      const tokens = Object.values(LONG_LIVED_TOKENS);
      for (const token of tokens) {
        const response = await request(app)
          .get("/bad-route")
          .set("Authorization", `Bearer ${token}`);
        expect(response.statusCode).toBe(200);
      }
    });
  });
});

afterAll(() => {
  stop();
});
