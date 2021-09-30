/// <reference types="cypress" />

Cypress.Commands.add("draw_features_should", (chainers, method, value) => {
  cy.window().then((window) => {
    let features = window.mapbox_handles.draw.getAll().features;
    cy.wrap(features).should(chainers, method, value);
  });
});
