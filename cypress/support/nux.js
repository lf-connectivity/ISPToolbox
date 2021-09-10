/// <reference types="cypress" />

import { assertion_within_subject } from "./assertions";

Cypress.Commands.add("close_nux", () => {
  // Close out of new user tour
  cy.get(".shepherd-cancel-icon").should("be.visible").click();
});

Cypress.Commands.add("open_nux", () => {
  cy.get("button#tool_help_button").click();
});

Cypress.Commands.add("get_nux", () => {
  cy.get("div.shepherd-content");
});

Cypress.Commands.add(
  "nux_learn_more_link_should",
  { prevSubject: true },
  assertion_within_subject("a:contains('Learn More')")
);

Cypress.Commands.add(
  "nux_cta_button_should",
  { prevSubject: true },
  assertion_within_subject("button.shepherd-button")
);
