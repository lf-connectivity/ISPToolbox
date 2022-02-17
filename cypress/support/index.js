/// <reference types="cypress" />
import "./file_upload_cmds";

import "@cypress/code-coverage/support";

import "./los_check";
import "./market_eval";
import "./map";
import "./draw";
import "./nux";
import "./pages";
import "./assertions";
import "./map_layers";
import "./navbar";
import "./sources_page";
import "./viewports";
import "./disconnect_utils";

import { LOGIN_PAGE } from "./pages";

export * from "./los_check";
export * from "./market_eval";
export * from "./map";
export * from "./draw";
export * from "./nux";
export * from "./pages";
export * from "./assertions";
export * from "./map_layers";
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
    cy.get("input[name=username]").should("be.visible").type(user.email);
    cy.get("input[name=password]")
      .should("be.visible")
      .type(`${user.password1}`);
  });
  cy.get("input[type=submit][value=Login]").click();

  // Make sure sessionid cookie exists
  cy.getCookie("sessionid").should("exist");

  // we should be redirected to homepage
  cy.location('pathname').should('eq', '/pro/')
});

Cypress.Commands.add("preserve_session_cookie", () => {
  Cypress.Cookies.preserveOnce("sessionid");
});

Cypress.Commands.add("create_session", () => {
  cy.visit("/pro/market/");
});

Cypress.Commands.add("wait_mapbox", () => {
  cy.get(".mapboxgl-ctrl-geocoder--input", { timeout: 9001 }).should("exist");
});


// https://github.com/quasarframework/quasar/issues/2233
// Ignore ResizeObserver error
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/
Cypress.on('uncaught:exception', (err) => {
  /* returning false here prevents Cypress from failing the test */
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false
  }
})