/// <reference types="cypress" />
import "./file_upload_cmds";

import "@cypress/code-coverage/support";

import "./los_check";
import "./market_eval";
import "./map";
import "./nux";
import "./pages";
import "./assertions";
import "./navbar";
import "./sources_page";
import "./viewports";

import { LOGIN_PAGE } from "./pages";

export * from "./los_check";
export * from "./market_eval";
export * from "./map";
export * from "./nux";
export * from "./pages";
export * from "./assertions";
export * from "./navbar";
export * from "./sources_page";
export * from "./viewports";

const compareSnapshotCommand = require("cypress-visual-regression/dist/command");

compareSnapshotCommand();

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

  // Make sure sessionid cookie exists
  cy.getCookie("sessionid").should("exist");

  // we should be redirected to homepage
  cy.url().should("include", "/pro");
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
