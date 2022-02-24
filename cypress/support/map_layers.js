export const TOWER_ICON = "tower-icon";
export const COVERAGE_AREA_ICON = "coverage-area-icon";


Cypress.Commands.add("toggle_map_layer_sidebar", () => {
  cy.get("button#map-layers-btn").click();
  cy.get("#map-layer-sidebar").should('be.visible');
});

Cypress.Commands.add("get_map_layer_sidebar", () => {
  cy.get("div#map-layer-sidebar");
});

Cypress.Commands.add("is_map_layer_sidebar_visible", () => {
  cy.get_map_layer_sidebar().then((sidebar) => {
    return sidebar.is("vislble");
  });
});

Cypress.Commands.add("get_user_map_layers", () => {
  cy.get("div#map-objects-section");
});

Cypress.Commands.add("get_user_map_layers_object", (text) => {
  cy.get(`div#map-objects-section div.object-toggle-row:contains(${text})`, {timeout: 10000});
});

Cypress.Commands.add(
  "toggle_user_map_layers_feature",
  { prevSubject: true },
  (subject) => {
    cy.wrap(subject).within(() => {
      cy.get("div.slider").click();
    });
  }
);

Cypress.Commands.add(
  "should_have_user_map_layer_icon",
  { prevSubject: true },
  (subject, icon_name) => {
    cy.wrap(subject).within(() => {
      cy.get("svg").should("have.attr", "cy-id", icon_name);
    });
  }
);

Cypress.Commands.add("user_map_layers_should_be_empty", () => {
  cy.get_map_layer_sidebar().contains(
    "Place towers or select areas on the map to start building your layers."
  );
});
