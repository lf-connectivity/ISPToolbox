/// <reference types="cypress" />

// These numbers were done through lots of trial/error to find a combination of numbers that worked.
// Might not work once the building dataset changes.
// TODO: Mock websocket responses out so nobody has to do guesswork in the future!!!

function setupTestOptions(testFunc) {
  return (options = {}) => {
    let testOptions = { mapLayersOpen: false };
    Object.assign(testOptions, options);
    testFunc(testOptions);
    cy.wait(500);
  };
}

// Offsets only work with setup from los_setup_tower_radio
function clickWithTestOptions(testOptions, x, y) {
  if (testOptions.mapLayersOpen) {
    cy.get("#map").click(x - 150, y);
  } else {
    cy.get("#map").click(x, y);
  }
}

Cypress.Commands.add(
  "market_eval_click_tower",
  setupTestOptions((testOptions) => {
    clickWithTestOptions(testOptions, 275, 200);
  })
);

Cypress.Commands.add(
  "market_eval_add_other_tower",
  setupTestOptions((testOptions) => {
    cy.get("#add-ap-btn").click();
    cy.wait(1000);
    clickWithTestOptions(testOptions, 355, 250);
  })
);

Cypress.Commands.add(
  "market_eval_delete_other_tower",
  setupTestOptions((testOptions) => {
    clickWithTestOptions(testOptions, 355, 250);
    cy.wait(1000);
    cy.get("button.mapbox-gl-draw_trash").click();
    cy.wait(1000);
  })
);
