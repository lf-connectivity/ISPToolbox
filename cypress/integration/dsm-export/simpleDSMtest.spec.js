/// <reference types="cypress" />

context('Test E2E DSM Export', () => {
    beforeEach(() => {
      cy.visit('/demo/dsm-app/')
    })
  
    it('Simple Page Load Test', () => {
      // Check modal appears
      cy.get('#DSMExportModal').should('be.visible').should('contain','DSM');
    });
})
