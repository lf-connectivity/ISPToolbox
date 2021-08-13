/// <reference types="cypress" />

context("Test Delete Control", () => {
  beforeEach(() => {
    cy.visit("/demo/los-check/");
  });

  it('Delete Link Using the Delete Button, proceed to add a new link by drawing on map', () => {
    cy.contains('resolution', {timeout: 10000}).should('exist');
    cy.get('.collapse-button').click();
    cy.get('.mapbox-gl-draw_trash').click();
    cy.get('#drawing_instructions', {timeout: 10000}).should('be.visible');
    cy.get('#loading_spinner').should('not.be.visible');
    cy.get('.radio-card-body').should('not.be.visible');

    // Let's add a link to the map
    cy.get("#add-link-btn").click();
    cy.wait(500);
    cy.get("#map").click(500, 200);
    cy.wait(500);
    cy.get("#map").click(600, 250);

    // Verify that drawing instructions are no longer visible
    cy.get("#drawing_instructions", { timeout: 10000 }).should(
      "not.be.visible"
    );

    // Verify that link is plotted
    cy.get(".radio-card-body", { timeout: 10000 }).should("be.visible");
    cy.get("#los-chart-tooltip-button", { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.get(".isptoolbox-tooltip").should("contain", "Google Elevation API");
  });
});
