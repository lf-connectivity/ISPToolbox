export const TOWER_ICON = "tower-icon";
export const COVERAGE_AREA_ICON = "coverage-area-icon";

const MAX_RETRIES = 10;

Cypress.Commands.add("toggle_map_layer_sidebar", () => {
  // Repeatedly click on map layers button until visibility is changed or
  // it's tried too much.
  let clickMapLayerSidebar = (body, original_visibility, count = 0) => {
    cy.get("button#map-layers-btn").click();
    cy.wait(500).then(() => {
      let visibility = body.find("div#map-layer-sidebar").is(":visible");
      if (visibility === original_visibility) {
        if (count > MAX_RETRIES) {
          throw new Error("Failed to toggle map layer sidebar visibility");
        } else {
          clickMapLayerSidebar(body, original_visibility, count + 1);
        }
      }
    });
  };

  cy.get("body").then((body) => {
    const original_visibility = body
      .find("div#map-layer-sidebar")
      .is(":visible");
    clickMapLayerSidebar(body, original_visibility);
  });
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
  cy.get(`div#map-objects-section div.object-toggle-row:contains(${text})`);
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
