/// <reference types="cypress" />

context('Test Delete Control', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })

    it('Delete Link Using the Delete Button, proceed to add a new link by typing', () => {
      cy.viewport(1000, 1000);
      cy.get('.mapbox-gl-draw_trash').click();
      cy.get('#drawing_instructions').should('be.visible');
      cy.get('#hgt-0').clear().type('60');
      cy.get('#hgt-1').clear().type('57');
      cy.get('#lat-0').clear().type('38.53362');
      cy.get('#lng-0').clear().type('-121.75712');
      cy.get('#lat-1').clear().type('38.53271');
      cy.get('#lng-1').clear().type('-121.75164{enter}')
    });
})
