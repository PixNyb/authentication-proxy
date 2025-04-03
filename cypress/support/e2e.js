/* eslint-disable no-undef */
/**
 * Logs in a user with the provided username and password.
 * @param {string} username - The username to log in with.
 * @param {string} password - The password to log in with.
 */
Cypress.Commands.add("login", (username, password) => {
    cy.visit({
        url: `/`,
        method: "GET",
        failOnStatusCode: false,
    });

    cy.get("input[name=username]").type(username);
    cy.get("input[name=password]").type(password);
    cy.get("#login button[type=submit]").click();
});

/**
 * Logs out the current user.
 */
Cypress.Commands.add("logout", () => {
    cy.visit({
        url: `/logout`,
        method: "GET",
        failOnStatusCode: false,
    });
});

/**
 * Clears authentication cookies.
 */
Cypress.Commands.add("clearAuthCookies", () => {
    cy.clearCookie("_access_token");
    cy.clearCookie("_refresh_token");
});

/**
 * Sets an access token cookie.
 * @param {string} token - The access token to set.
 */
Cypress.Commands.add("setAccessToken", (token) => {
    cy.setCookie("_access_token", token);
});

/**
 * Sets a refresh token cookie.
 * @param {string} token - The refresh token to set.
 */
Cypress.Commands.add("setRefreshToken", (token) => {
    cy.setCookie("_refresh_token", token);
});