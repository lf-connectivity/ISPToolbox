Cypress.Commands.add("toggle_map_layer_sidebar", () => {
  cy.get("button#map-layers-btn").click();
  cy.wait(500);
});

Cypress.Commands.add("get_map_layer_sidebar", () => {
  cy.get("div#map-layer-sidebar");
});
