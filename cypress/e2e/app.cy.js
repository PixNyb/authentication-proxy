/* eslint-disable no-undef */
describe("Health Checks", () => {
    it("should load the health check endpoint", () => {
        cy.request(`/healthz`).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.eq("OK");
        });
    });
});

describe("Login Functionality", () => {
    beforeEach(() => {
        cy.clearCookies();
    });

    it("should render login form when no tokens are present", () => {
        cy.visit({
            method: "GET",
            url: `/`,
            failOnStatusCode: false,
        });

        cy.url().should("include", "/login");
        cy.url().should("not.include", `error=`);
        cy.url().should("not.include", `redirect_url=`);

        cy.get("h1").should("contain", "Login");
        cy.get("input[name=username]").should("exist");
        cy.get("input[name=password]").should("exist");
        cy.get("#login button[type=submit]").should("exist");
    });

    it("should log in successfully using preset username and password", () => {
        cy.login("testuser", "testpassword");

        cy.url().should("include", "/");
        cy.getCookie("_access_token").should("exist");
        cy.getCookie("_refresh_token").should("exist");
        cy.get("h1").should("contain", "Logged In");
    });

    it("should give an error message for invalid login", () => {
        cy.login("invaliduser", "invalidpassword");

        cy.url().should("include", "/login");
        cy.url().should("include", `error=${encodeURIComponent("Invalid credentials")}`);
        cy.get("h1").should("contain", "Login");

        cy.get(".error__message").should("exist");
        cy.get(".error__message").should("contain", "Invalid credentials");
    });

    it("should redirect to the proper URL after login", () => {
        cy.visit({
            method: "GET",
            url: `/login?redirect_url=${encodeURIComponent("http://example.com/some/path")}`,
            failOnStatusCode: false,
        });

        cy.get("input[name=username]").type("testuser");
        cy.get("input[name=password]").type("testpassword");
        cy.get("#login button[type=submit]").click();

        cy.origin("http://example.com", () => {
            cy.url().should("include", "http://example.com/some/path");
        });
    });
});

describe("Logout Functionality", () => {
    beforeEach(() => {
        cy.clearCookies();
    });

    it("should log out successfully", () => {
        cy.login("testuser", "testpassword");
        cy.logout();

        cy.url().should("include", "/");
        cy.getCookie("_access_token").should("not.exist");
        cy.getCookie("_refresh_token").should("not.exist");
    });

    it("should clear cookies on logout", () => {
        cy.login("testuser", "testpassword");
        cy.getCookie("_access_token").should("exist");
        cy.getCookie("_refresh_token").should("exist");

        cy.logout();

        cy.getCookie("_access_token").should("not.exist");
        cy.getCookie("_refresh_token").should("not.exist");
    });
});

describe("Token Handling", () => {
    it("should go to refresh endpoint when access token is invalid", () => {
        cy.login("testuser", "testpassword");
        cy.getCookie("_access_token").should("exist");
        cy.getCookie("_refresh_token").should("exist");
        cy.clearCookie("_access_token");
        cy.getCookie("_access_token").should("not.exist");

        cy.visit({
            method: "GET",
            url: `/`,
            failOnStatusCode: false,
        });

        cy.get("h1").should("contain", "Logged In");
        cy.getCookie("_access_token").should("exist");
        cy.getCookie("_refresh_token").should("exist");
        cy.url().should("include", "/");
    });

    it("should redirect to the proper URL after refresh", () => {
        const forwardedHost = "example.com";
        const forwardedUri = "/some/path";

        cy.login("testuser", "testpassword");
        cy.getCookie("_access_token").should("exist");
        cy.getCookie("_refresh_token").should("exist");
        cy.setCookie("_access_token", "expired_token");

        cy.visit({
            method: "GET",
            url: `/`,
            failOnStatusCode: false,
            headers: {
                "x-forwarded-host": forwardedHost,
                "x-forwarded-uri": forwardedUri,
            }
        });

        cy.origin(`http://${forwardedHost}`, () => {
            cy.url().should("include", `http://example.com/some/path`);
        });
    });

    it("should handle missing refresh token gracefully", () => {
        cy.visit({
            method: "GET",
            url: `/refresh`,
            failOnStatusCode: false,
        });

        cy.url().should("include", "/login");
    });

    it("should handle invalid refresh token", () => {
        cy.setCookie("_refresh_token", "invalid_token");

        cy.visit({
            method: "GET",
            url: `/refresh`,
            failOnStatusCode: false,
        });

        cy.url().should("include", "/login");
        cy.getCookie("_refresh_token").should("not.exist");
    });

    it("should send logged in users to the home page when accessing the login page", () => {
        cy.login("testuser", "testpassword");

        cy.visit({
            method: "GET",
            url: `/login`,
            failOnStatusCode: false,
        });

        cy.url().should("include", "/");
        cy.get("h1").should("contain", "Logged In");
    });

    it("should add a redirect_url query parameter if present", () => {
        const forwardedHost = "example.com";
        const forwardedUri = "/some/path";

        const redirectUrl = `http://${forwardedHost}${forwardedUri}`;

        cy.visit({
            method: "GET",
            url: `/`,
            headers: {
                "x-forwarded-host": forwardedHost,
                "x-forwarded-uri": forwardedUri,
            }
        })

        cy.url().should("include", "/login");
        cy.url().should("include", `redirect_url=${encodeURIComponent(redirectUrl)}`);
    });
});

describe('CSRF Protection', () => {
    it('should reject login requests with invalid CSRF token', () => {
        cy.visit({
            method: "GET",
            url: `/login`,
            failOnStatusCode: false,
        });

        cy.get("input[name=username]").type("testuser");
        cy.get("input[name=password]").type("testpassword");

        cy.get('input[name="_csrf"]').invoke('val', 'invalid_csrf_token');

        cy.get("#login button[type=submit]").click();

        cy.get("h1").should("contain", "Oops!");
    });
});
