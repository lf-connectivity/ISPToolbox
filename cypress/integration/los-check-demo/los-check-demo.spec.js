/// <reference types="cypress" />

context('Create a new link', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })
  
    it('.children() - get child DOM elements', () => {
      // https://on.cypress.io/children
      cy.get('.traversal-breadcrumb')
        .children('.active')
        .should('contain', 'Data')
    });
})
