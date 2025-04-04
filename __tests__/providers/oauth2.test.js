const { stop } = require("../../index");

jest.mock("jsonwebtoken");

describe("OAuth2 Authentication Strategy", () => {
  // Mock environment variables
  process.env.OAUTH2_TEST_AUTH_URL = "https://example.com/auth";
  process.env.OAUTH2_TEST_TOKEN_URL = "https://example.com/token";
  process.env.OAUTH2_TEST_CLIENT_ID = "test-client-id";
  process.env.OAUTH2_TEST_CLIENT_SECRET = "test-client-secret";
  process.env.OAUTH2_TEST_DOMAIN_WHITELIST = "example.com";
  process.env.OAUTH2_TEST_USER_WHITELIST = "user@example.com";
  process.env.OAUTH2_TEST_DISPLAY_NAME = "Test OAuth2";
  process.env.OAUTH2_TEST_ICON = "test-icon";
  const oauth2Provider = require("../../src/app/providers/oauth2.provider");

  it("should correctly configure the OAuth2 strategy", () => {
    const provider = oauth2Provider("test", "TEST");

    expect(provider.name).toBe("oauth2_test");
    expect(provider.type).toBe("oauth2");
    expect(provider.params.clientID).toBe("test-client-id");
    expect(provider.params.clientSecret).toBe("test-client-secret");
    expect(provider.params.loginURL).toBe("/_oauth2/test");
    expect(provider.params.callbackURL).toBe("/_oauth2/test/callback");
  });

  it("should correctly process user profile in verify callback", (done) => {
    const provider = oauth2Provider("test", "TEST");
    const mockProfile = { id: "user@example.com", displayName: "Test User" };

    provider.verify(null, null, mockProfile, (error, user) => {
      expect(error).toBeNull();
      expect(user).toEqual({
        id: mockProfile.id,
        strategy: "oauth2_test",
        profile: mockProfile,
      });
      done();
    });
  });
});

afterAll(() => {
  stop();
});
