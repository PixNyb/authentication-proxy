const { server } = require("../../app");

jest.mock("jsonwebtoken");

describe("OAuth2 Authentication Strategy", () => {
  // Mock environment variables
  process.env.OIDC_TEST_ISSUER = "https://example.com";
  process.env.OIDC_TEST_AUTH_URL = "https://example.com/auth";
  process.env.OIDC_TEST_TOKEN_URL = "https://example.com/token";
  process.env.OIDC_TEST_USER_URL = "https://example.com/userinfo";
  process.env.OIDC_TEST_CLIENT_ID = "test-client-id";
  process.env.OIDC_TEST_CLIENT_SECRET = "test-client-secret";
  process.env.OIDC_TEST_DOMAIN_WHITELIST = "example.com";
  process.env.OIDC_TEST_USER_WHITELIST = "user@example.com";
  process.env.OIDC_TEST_DISPLAY_NAME = "Test OIDC";
  process.env.OIDC_TEST_ICON = "fas fa-test";
  const oidcProvider = require("../../src/providers/oidc");

  it("should correctly configure the OIDC strategy", () => {
    const provider = oidcProvider("test", "TEST");

    expect(provider.name).toBe("oidc_test");
    expect(provider.type).toBe("oidc");
    expect(provider.params.clientID).toBe("test-client-id");
    expect(provider.params.clientSecret).toBe("test-client-secret");
    expect(provider.params.loginURL).toBe("/_oidc/test");
    expect(provider.params.callbackURL).toBe("/_oidc/test/callback");
  });

  it("should correctly process user profile in verify callback", (done) => {
    const provider = oidcProvider("test", "TEST");
    const mockProfile = {
      id: "oidc123",
      displayName: "Test User",
      emails: [{ value: "test@example.com" }],
      photos: [{ value: "http://example.com/photo.jpg" }],
    };

    provider.verify(null, "oidc123", mockProfile, null, null, (err, user) => {
      expect(err).toBeNull();
      expect(user).toEqual({
        id: "test@example.com",
        strategy: "oidc_test",
        profile: {
          oidcId: "oidc123",
          displayName: "Test User",
          email: "test@example.com",
          photo: "http://example.com/photo.jpg",
        },
      });
      done();
    });
  });
});

afterAll(() => {
  server.close();
});
