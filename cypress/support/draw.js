/// <reference types="cypress" />

Cypress.Commands.add("draw_get_features", () => {
  cy.window().then((window) => {
    return window.mapbox_handles.draw.getAll().features;
  });
});

Cypress.Commands.add("place_tower", (point) => {
  cy.get("#add-ap-btn").click();
  cy.wait(1000);
  cy.click_point_on_map(point);
});

Cypress.Commands.add("delete_tower", (point) => {
  cy.click_point_on_map(point);
  cy.wait(500);
  cy.get("button.mapbox-gl-draw_trash").click();
});

Cypress.Commands.add("draw_coverage_area", (points) => {
  cy.get("#draw-coverage-area-btn").click();
  cy.wait(1000);
  points.forEach((point) => {
    cy.click_point_on_map(point);
    cy.wait(500);
  });
  cy.click_point_on_map(points[0]);
});
