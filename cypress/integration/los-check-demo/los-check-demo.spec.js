/// <reference types="cypress" />

context('Create a new link', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })
  
    it('Check if Link Status contains "Link Status"', () => {
      // https://on.cypress.io/children
      cy.get('.link-status')
        .should('contain', 'Link Status')
    });
})
