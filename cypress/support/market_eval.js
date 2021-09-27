/// <reference types="cypress" />

import { not_exist_or_not_be_visible } from ".";

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

Cypress.Commands.add("market_eval_click_info_tooltip", (text) => {
  cy.get(`p:contains(${text})`)
    .parent()
    .within(() => {
      cy.get('a[data-toggle="popover"]').click({ force: true });
    });
});

Cypress.Commands.add(
  "market_eval_info_tooltip_should_be",
  (tooltip_text, header, body, links = []) => {
    cy.market_eval_click_info_tooltip(tooltip_text);
    cy.get("div.popover h3.popover-header").should_have_sanitized_text(
      "equal",
      header
    );

    cy.wait(1000);
    cy.market_eval_click_info_tooltip(tooltip_text);
    cy.get("div.popover div.popover-body p:first").should_have_sanitized_text(
      "equal",
      body
    );

    cy.wait(1000);
    cy.market_eval_click_info_tooltip(tooltip_text);

    // Check that no link exists if link is undefined
    if (!links.length) {
      cy.get("div.popover div.popover-links").should(
        not_exist_or_not_be_visible
      );
    } else {
      // The links are either passed in as <href> or [<text>, <href>]
      cy.get("div.popover div.popover-links a").each((val, index) => {
        let text =
          typeof links[index] === "string"
            ? "See Data Source"
            : links[index][0];

        let href =
          typeof links[index] === "string" ? links[index] : links[index][1];
        cy.wrap(val)
          .should_have_sanitized_attr("equal", "target", "_blank")
          .should_have_sanitized_attr("equal", "href", href)
          .should_have_sanitized_text("equal", text);
      });
    }
  }
);
