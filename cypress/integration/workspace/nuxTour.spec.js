/// <reference types="cypress" />

import { DESKTOP_SIZE, MOBILE_SIZE, TABLET_SIZE } from "../../support";
import { LOS_CHECK_PAGE, MARKET_EVAL_PAGE } from "../../support/pages";

// TODO: Fix bug with logged out nuxes not triggering, then add e2e tests for that here

// Copypasting more intelligently
function create_logged_in_nux_test_case(
  page_name,
  page_url,
  expected_learn_more_url
) {
  return context(`${page_name} logged in nux tests`, () => {
    beforeEach(() => {
      cy.login();
    });

    it("Nux should pop up on desktop, disappear when closing it, and pop back up when clicking the tool button", () => {
      cy.viewport(DESKTOP_SIZE);
      cy.visit(page_url);
      cy.wait_mapbox();

      // Check Learn More link and button saying Take a Tour.
      cy.get_nux()
        .should("be.visible")
        .nux_learn_more_link_should("have.attr", "target", "_blank")
        .nux_learn_more_link_should(
          "have.attr",
          "href",
          expected_learn_more_url
        )
        .nux_cta_button_should("have.text", "Take a Tour");

      cy.close_nux();
      cy.get_nux().should("not.exist");

      cy.open_nux();
      cy.get_nux()
        .should("be.visible")
        .nux_learn_more_link_should("have.attr", "target", "_blank")
        .nux_learn_more_link_should(
          "have.attr",
          "href",
          expected_learn_more_url
        )
        .nux_cta_button_should("have.text", "Take a Tour");
    });

    it("Nux should not appear on tablet", () => {
      cy.viewport(TABLET_SIZE);
      cy.visit(page_url);
      cy.wait_mapbox();

      cy.get_nux().should("not.exist");
    });

    it("Nux should not appear on mobile", () => {
      cy.viewport(MOBILE_SIZE);
      cy.visit(page_url);
      cy.wait_mapbox();

      cy.get_nux().should("not.exist");
    });
  });
}

create_logged_in_nux_test_case(
  "Market Evaluator",
  MARKET_EVAL_PAGE,
  "https://facebook.com/isptoolbox/market-evaluator/"
);

create_logged_in_nux_test_case(
  "LOS Check",
  LOS_CHECK_PAGE,
  "https://facebook.com/isptoolbox/line-of-sight-check/"
);
