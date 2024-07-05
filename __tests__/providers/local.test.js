const { server } = require("../../app");

jest.mock("jsonwebtoken");

describe("Local Authentication Strategy", () => {
  // Mock environment variables
  process.env.LOCAL_TEST_USERS = "user:$apr1$PJ3UdeuW$sdScbEB7d/HK0mFIx/oN1.";
  const localProvider = require("../../src/providers/local");

  it("should authenticate a user with correct credentials", (done) => {
    const verifyCallback = localProvider("test", "TEST").verify;
    verifyCallback("user", "password", (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeTruthy();
      done();
    });
  });

  it("should reject a user with incorrect credentials", (done) => {
    const verifyCallback = localProvider("test", "TEST").verify;
    verifyCallback("testuser", "wrongpassword", (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeFalsy();
      done();
    });
  });
});

afterAll(() => {
  server.close();
});
