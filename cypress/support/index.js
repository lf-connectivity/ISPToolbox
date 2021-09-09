/// <reference types="cypress" />

import "./nux";
import "./pages";
import "./assertions";
import "./navbar";
import "./sources_page";
import "./viewports";

import { LOGIN_PAGE } from "./pages";

export * from "./nux";
export * from "./pages";
export * from "./assertions";
export * from "./navbar";
export * from "./sources_page";
export * from "./viewports";

Cypress.Commands.add("login", () => {
  // reset test accounts
  cy.request("POST", "/test/accounts/").then((response) => {
    expect(response.body).to.have.property("success", true);
  });
  cy.visit(LOGIN_PAGE);

  cy.fixture("login_fixture").then((user) => {
    // {enter} causes the form to submit
    cy.get("input[name=username]").type(user.email);
    cy.get("input[name=password]").type(`${user.password1}{enter}`);
  });

  // we should be redirected to homepage
  cy.url().should("include", "/pro");
});

Cypress.Commands.add("create_session", () => {
  cy.visit("/pro/market/");
});

Cypress.Commands.add("wait_mapbox", () => {
  cy.get(".mapboxgl-ctrl-geocoder--input", { timeout: 9001 }).should("exist");
});
