const { stop } = require("../../app");

jest.mock("jsonwebtoken", () => ({
  decode: jest.fn().mockReturnValue({
    sub: "apple123",
    email: "test@example.com",
  }),
}));

describe("Apple Authentication Strategy", () => {
  // Mock environment variables
  process.env.APPLE_TEST_CLIENT_ID = "test-client-id";
  process.env.APPLE_TEST_TEAM_ID = "test-team-id";
  process.env.APPLE_TEST_KEY_ID = "test-key-id";
  process.env.APPLE_TEST_PRIVATE_KEY_LOCATION = "/path/to/key";
  process.env.APPLE_TEST_DOMAIN_WHITELIST = "example.com";
  process.env.APPLE_TEST_USER_WHITELIST = "user@example.com";
  process.env.APPLE_TEST_DISPLAY_NAME = "Test Apple";
  process.env.APPLE_TEST_ICON = "test-icon";
  const appleProvider = require("../../src/providers/apple");

  it("should correctly configure the Apple strategy", () => {
    const provider = appleProvider("test", "TEST");

    expect(provider.name).toBe("apple_test");
    expect(provider.type).toBe("apple");
    expect(provider.params.clientID).toBe("test-client-id");
    expect(provider.params.teamID).toBe("test-team-id");
    expect(provider.params.keyID).toBe("test-key-id");
    expect(provider.params.privateKeyLocation).toBe("/path/to/key");
    expect(provider.params.loginURL).toBe("/_apple/test");
    expect(provider.params.callbackURL).toBe("/_apple/test/callback");
  });

  it("should correctly process idToken in verify callback", (done) => {
    const provider = appleProvider("test", "TEST");
    const mockIdToken = "mockIdToken";
    provider.verify({}, null, null, mockIdToken, {}, (err, user) => {
      expect(err).toBeNull();
      expect(user).toEqual({
        id: "test@example.com",
        strategy: "apple_test",
        profile: {
          appleId: "apple123",
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
