/// <reference types="cypress" />

import { not_exist_or_not_be_visible } from ".";

export const OVERLAY_RDOF = "FCC Rural Digital Opportunity Fund";
export const OVERLAY_CENSUS = "Census Blocks";
export const OVERLAY_COMMUNITY_CONNECT = "Non-urban < 10/1 Mbps";
export const OVERLAY_CBRS = "CBRS PAL Holders";
export const OVERLAY_TRIBAL = "Tribal Lands";

export const SOURCE_RDOF = "rdof2020-overlay";
export const SOURCE_CENSUS = "census-block-overlay";
export const SOURCE_COMMUNITY_CONNECT = "community-connect-overlay";
export const SOURCE_CBRS = "cbrs-overlay";
export const SOURCE_TRIBAL = "tribal-overlay";

Cypress.Commands.add("market_eval_click_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_and_expect_popup(session.tower);
  });
});

Cypress.Commands.add("market_eval_add_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.place_tower(session.add_tower);
  });
});

Cypress.Commands.add("market_eval_delete_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.delete_tower(session.add_tower);
  });
});

Cypress.Commands.add("market_eval_click_info_tooltip", (text) => {
  cy.get(`p:contains(${text})`)
    .parent()
    .within(() => {
      cy.get('a[data-toggle="popover"]').click({ force: true });
    });
});

Cypress.Commands.add("market_eval_toggle_geo_overlay", (overlay) => {
  cy.get(`p:contains(${overlay})`)
    .parent()
    .within(() => {
      cy.get("div.slider").click();
      cy.wait(1000);
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
