/// <reference types="cypress" />

import { not_exist_or_not_be_visible } from ".";

Cypress.Commands.add("market_eval_click_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_point_on_map(session.tower);
  });
});

Cypress.Commands.add("market_eval_add_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.get("#add-ap-btn").click();
    cy.wait(1000);
    cy.click_point_on_map(session.add_tower);
  });
});

Cypress.Commands.add("market_eval_delete_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_point_on_map(session.add_tower);
    cy.wait(1000);
    cy.get("button.mapbox-gl-draw_trash").click();
    cy.wait(1000);
  });
});

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

    cy.get("div.popover div.popover-body p:first").should_have_sanitized_text(
      "equal",
      body
    );

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
