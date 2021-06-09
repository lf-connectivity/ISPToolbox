/// <reference types="cypress" />

context('Test Latest Lidar View', () => {
    beforeEach(() => {
      cy.visit('/demo/latest-gis-data/')
    })
  
    it('Check that latest gis view loads without errors', () => {
      // Page should load without any errors
      cy.contains('United States').should('be.visible');
    });
})
