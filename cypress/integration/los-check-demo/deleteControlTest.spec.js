/// <reference types="cypress" />

context('Test Delete Control', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })

    it('Delete Link Using the Delete Button, proceed to add a new link by drawing on map', () => {
      cy.get('.mapbox-gl-draw_trash').click();
      cy.get('#drawing_instructions').should('be.visible');
      cy.get('#loading_spinner').should('not.be.visible');
      cy.get('.radio-card-body').should('not.be.visible');

      // Let's add a link to the map
      cy.get('#add-link-btn').click();
      cy.get('#map').click(100, 200).click(200, 150);

      // Verify that drawing instructions are no longer visible
      cy.get('#drawing_instructions').should('not.be.visible');

      // Verify that link is plotted
      cy.get('.radio-card-body').should('be.visible');
      cy.contains('Legend').click();
      cy.get('.isptoolbox-tooltip').should('contain', 'Google Elevation API');
    });
})
