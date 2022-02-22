/// <reference types="cypress" />

describe("Test Delete Your Information Flow", () => {
  beforeEach(() => {
    cy.login_fast();
    cy.fixture("login_fixture").as("user");
  });

  it("Test Confirmation Code", function () {
    cy.visit("/pro/account/delete/");
    cy.get("input[name=confirmation]").type('perm');
    cy.get("input[type=submit]").click();
    cy.contains('incorrect confirmation').should('be.visible');
    cy.visit("/pro/account/delete/");
    cy.get("input[name=confirmation]").type('permanently delete');
    cy.get("input[type=submit]").click();  	
  });
  
});
