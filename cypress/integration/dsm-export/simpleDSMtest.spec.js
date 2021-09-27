/// <reference types="cypress" />

context('Test E2E DSM Export', () => {
  beforeEach(() => {
    cy.visit('/demo/dsm-app/')
  })
    
  it('Simple Page Load Test', () => {
    // Check modal appears
    cy.get('#DSMExportModal', {timeout: 10000}).should('be.visible', {timeout: 10000}).should('contain','DSM');

    // Close the popup message, wait 500ms or the button seems not closing the popup everytime when clicked
    cy.wait(500);
    cy.get('#DSMExportModalLabel').siblings('button.close').click('bottom').should('not.be.visible');

    cy.wait_mapbox();
    // Draw a triangle
    cy.get('#draw-polygon-button').click();
    cy.get('#map').should('be.visible', {timeout: 10000})
    .click(100, 100)
    .click(200, 100)
    .click(200, 200);

    cy.get('#map').type('Cypress.io{enter}')

    // Click export button
    cy.get('#export-dsm-btn').click();

    // Check export status
    cy.get('#dsm_export_status').contains('status:SUCCESS', {timeout: 10000});

    // Close the popup message
    cy.get('#DSMExportModalLabel').siblings('button.close').click();

  });

})
