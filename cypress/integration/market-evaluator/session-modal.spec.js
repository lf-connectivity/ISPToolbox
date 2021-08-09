/// <reference types="cypress" />
context('Work', () => {
    beforeEach(() => {
        cy.login();
    })

    it('Test create session modal', () => {
        const session_name = "TESTSESSION";
        const default_workspace_name = 'untitled workspace';

        cy.visit('/pro/market/');

        // Close out of new user tour
        cy.get('.shepherd-cancel-icon').should('be.visible');
        cy.get('body').type('{esc}');

        // We should see an untitled workspace
        cy.contains(default_workspace_name).should('be.visible');

        // Click on the session menu
        cy.contains('Editing').click();

        // Click on the create new session
        cy.contains('New Session').click();

        // Set new session name
        cy.get('input[name=name][id=id_name]').clear().type(session_name);
        cy.get('#workspace_create_session_form input[type=submit][value=Save]').click();
        // Click on the 
        cy.location().should((loc) => {
            expect(loc.pathname).to.contain('market');
            expect(loc.pathname).to.contain(session_name);
        });

        // Let's check that the list view works properly
        // Click on the session menu
        cy.contains('Editing').click();
        // Open session modal
        cy.contains('Open Session').click();

        // Make sure that all sessions are visible
        cy.contains(session_name).should('be.visible');
        cy.contains(default_workspace_name).should('be.visible');
    });
})
