/// <reference types="cypress" />

describe("Test Delete Your Information Flow", () => {
  beforeEach(() => {
    cy.login();
    cy.fixture("login_fixture").as("user");
  });

  it("Test Confirmation Code", function () {
    cy.visit("/pro/account/delete/");
    cy.get("input[name=confirmation]").type('perm');
    cy.get("input[type=submit]").click();
    cy.contains('incorrect confirmation').should('be.visible');
  });

  it("Test DYI Flow", function(){
    cy.visit("/pro/account/delete/");
    cy.get("input[name=confirmation]").type('permanently delete');
    cy.get("input[type=submit]").click();  	
  })
});
