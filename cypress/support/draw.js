// (c) Meta Platforms, Inc. and affiliates. Copyright
/// <reference types="cypress" />

Cypress.Commands.add("draw_get_features", () => {
  cy.window().then((window) => {
    return window.mapbox_handles.draw.getAll().features;
  });
});

Cypress.Commands.add("place_tower", (point) => {
  cy.get("#add-ap-btn").click().should('have.class', 'btn-primary');
  cy.click_point_on_map(point);
});

Cypress.Commands.add("delete_tower", (point) => {
  cy.click_point_on_map(point);
  cy.get("button.mapbox-gl-draw_trash").click();
});

Cypress.Commands.add("draw_coverage_area", (points) => {
  cy.get("#draw-coverage-area-btn").click().should('have.class', 'btn-primary');
  points.forEach((point) => {
    cy.click_point_on_map(point);
  });
  cy.click_point_on_map(points[0]);
});
