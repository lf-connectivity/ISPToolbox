/// <reference types="cypress" />

// These numbers were done through lots of trial/error to find a combination of numbers that worked.
// Might not work once the building dataset changes.
// TODO: Mock websocket responses out so nobody has to do guesswork in the future!!!

function setupTestOptions(testFunc) {
  return (options = {}) => {
    let testOptions = { linkProfileOpen: false, mapLayersOpen: false };
    Object.assign(testOptions, options);
    testFunc(testOptions);
    cy.wait(500);
  };
}

// Offsets only work with setup from los_setup_tower_radio
function clickWithTestOptions(testOptions, x, y) {
  if (testOptions.linkProfileOpen) {
    cy.get("#map").click(x, y - 100);
  } else if (testOptions.mapLayersOpen) {
    cy.get("#map").click(x - 150, y);
  } else {
    cy.get("#map").click(x, y);
  }
}

Cypress.Commands.add("los_setup_tower_radio", () => {
  for (let i = 0; i < 12; i++) {
    cy.get("#map").trigger("wheel", 700, 300, { deltaY: -50000 });
    cy.wait(100);
  }

  cy.get("#add-ap-btn").click();
  cy.wait(500);
  cy.get("#map").click(450, 200);
  cy.wait(6500);
  cy.get("#map").click(220, 300);
  cy.wait(100);
  cy.contains("View Line of Sight").click();
  cy.wait(1000);

  cy.los_get_link_profile().should("be.visible");
  cy.los_toggle_link_profile();
  cy.los_get_link_profile().should("not.be.visible");
});

Cypress.Commands.add(
  "los_click_tower",
  setupTestOptions((testOptions) => {
    clickWithTestOptions(testOptions, 450, 200);
  })
);

Cypress.Commands.add(
  "los_click_radio",
  setupTestOptions((testOptions) => {
    clickWithTestOptions(testOptions, 220, 300);
  })
);

Cypress.Commands.add(
  "los_click_building",
  setupTestOptions((testOptions) => {
    clickWithTestOptions(testOptions, 205, 260);
  })
);

Cypress.Commands.add(
  "los_add_other_tower",
  setupTestOptions((testOptions) => {
    cy.get("#add-ap-btn").click();
    cy.wait(500);
    clickWithTestOptions(testOptions, 550, 300);
  })
);

Cypress.Commands.add("los_toggle_link_profile", () => {
  cy.get("div.link-view-bar div.collapse-button:first a:first").click();
  cy.wait(500);
});

Cypress.Commands.add("los_toggle_map_layer_sidebar", () => {
  cy.get("button#map-layers-btn").click();
  cy.wait(500);
});

Cypress.Commands.add("los_get_link_profile", () => {
  cy.get("div#data-container");
});

Cypress.Commands.add("los_get_mapbox_tooltip", () => {
  cy.get("div.mapboxgl-popup-content");
});

Cypress.Commands.add("los_get_map_layer_sidebar", () => {
  cy.get("div#map-layer-sidebar");
});
