const { stop } = require("../../index");

jest.mock("passport-ldapauth");

describe("LDAP Authentication Strategy", () => {
  // Mock environment variables
  process.env.LDAP_LDAP_URL = "ldap://test-ldap";
  process.env.LDAP_LDAP_BIND_DN = "cn=admin,dc=example,dc=com";
  process.env.LDAP_LDAP_BIND_CREDENTIALS = "admin-password";
  process.env.LDAP_LDAP_SEARCH_BASE = "ou=users,dc=example,dc=com";
  process.env.LDAP_LDAP_SEARCH_FILTER = "(uid={{username}})";
  process.env.LDAP_LDAP_DISPLAY_NAME = "Test LDAP";
  process.env.LDAP_LDAP_ICON = "fas fa-user";
  const ldapProvider = require("../../src/app/providers/ldap.provider");

  it("should correctly configure the LDAP strategy", () => {
    const provider = ldapProvider("ldap", "LDAP");

    expect(provider.name).toBe("ldap_ldap");
    expect(provider.type).toBe("ldap");
    expect(provider.params.server.url).toBe("ldap://test-ldap");
    expect(provider.params.server.bindDN).toBe("cn=admin,dc=example,dc=com");
    expect(provider.params.server.bindCredentials).toBe("admin-password");
    expect(provider.params.loginURL).toBe("/_ldap/ldap");
    expect(provider.params.callbackURL).toBe("/_ldap/ldap/callback");
  });

  it("should correctly process user profile in verify callback", (done) => {
    const provider = ldapProvider("ldap", "LDAP");

    const mockUser = {
      uid: "ldap123",
      displayName: "Test User",
    };

    provider.verify(mockUser, (err, user) => {
      expect(err).toBeNull();
      expect(user).toEqual({
        id: "ldap123",
        strategy: "ldap_ldap",
        profile: mockUser,
      });
      done();
    });
  });
});

afterAll(() => {
  stop();
});