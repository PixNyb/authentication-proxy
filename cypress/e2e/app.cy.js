const cy = require('cypress');

describe('Authentication Proxy E2E Tests', () => {
    beforeEach(() => {
        cy.visit('/'); // Visit the root URL of the application
    });

    it('should redirect to the login page and display the login page', () => {
        cy.url().should('include', '/login');
        cy.get('h1').contains('Login');
    });
});