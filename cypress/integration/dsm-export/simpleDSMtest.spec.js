/// <reference types="cypress" />

context('Test E2E DSM Export', () => {
    beforeEach(() => {
      cy.visit('/demo/dsm-app/')
    })
  
    it('Simple Page Load Test', () => {
      // Check modal appears
      cy.get('#DSMExportModal', {timeout: 10000}).should('be.visible', {timeout: 10000}).should('contain','DSM');
    });
})
