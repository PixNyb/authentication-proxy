const { stop } = require("../../index");

jest.mock("jsonwebtoken");

describe("Google Authentication Strategy", () => {
  // Mock environment variables
  process.env.GOOGLE_TEST_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_TEST_CLIENT_SECRET = "test-client-secret";
  process.env.GOOGLE_TEST_SCOPE = "profile email";
  process.env.GOOGLE_TEST_DOMAIN_WHITELIST = "example.com";
  process.env.GOOGLE_TEST_USER_WHITELIST = "user@example.com";
  process.env.GOOGLE_TEST_DISPLAY_NAME = "Test Google";
  process.env.GOOGLE_TEST_ICON = "test-icon";
  const googleProvider = require("../../src/app/providers/google.provider");

  it("should correctly configure the Google strategy", () => {
    const provider = googleProvider("test", "TEST");

    expect(provider.name).toBe("google_test");
    expect(provider.type).toBe("google");
    expect(provider.params.clientID).toBe("test-client-id");
    expect(provider.params.clientSecret).toBe("test-client-secret");
    expect(provider.params.loginURL).toBe("/_google/test");
    expect(provider.params.callbackURL).toBe("/_google/test/callback");
  });

  it("should correctly process user profile in verify callback", (done) => {
    const provider = googleProvider("test", "TEST");

    const mockProfile = {
      id: "google123",
      displayName: "Test User",
      emails: [{ value: "test@example.com" }],
    };

    provider.verify(null, null, mockProfile, (err, user) => {
      expect(err).toBeNull();
      expect(user).toEqual({
        id: "test@example.com",
        strategy: "google_test",
        profile: {
          googleId: "google123",
          displayName: "Test User",
          email: "test@example.com",
        },
      });
      done();
    });
  });
});

afterAll(() => {
  stop();
});
