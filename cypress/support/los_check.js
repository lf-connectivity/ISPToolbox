/// <reference types="cypress" />

Cypress.Commands.add("los_click_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_and_expect_popup(session.tower);
  });
});

Cypress.Commands.add("los_click_radio", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_and_expect_popup(session.cpe);
  });
});

Cypress.Commands.add("los_click_building", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.click_and_expect_popup(session.building);
  });
});

Cypress.Commands.add("los_add_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.place_tower(session.add_tower);
  });
});

Cypress.Commands.add("los_delete_other_tower", () => {
  cy.fixture("session_fixture").then((session) => {
    cy.delete_tower(session.add_tower);
  });
});

Cypress.Commands.add("los_toggle_link_profile", () => {
  cy.get("div.link-view-bar div.collapse-button:first a:first").click();
  cy.wait(500);
});

Cypress.Commands.add("los_get_link_profile", () => {
  cy.get("div#data-container");
});
