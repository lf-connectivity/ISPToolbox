/// <reference types="cypress" />

describe("Test Sign Up / Login", () => {
  beforeEach(() => {
    // reset test accounts
    cy.request("POST", "/test/accounts/").then((response) => {
      expect(response.body).to.have.property("success", true);
    });
    cy.fixture("signup_fixture").as("user_signup");
    cy.fixture("login_fixture").as("user");
  });

  it("Check Login Works", function () {
    cy.visit("/pro/accounts/sign-in/");

    // {enter} causes the form to submit
    cy.get("input[name=username]").type(this.user.email);
    cy.get("input[name=password]").type(`${this.user.password1}{enter}`);

    // we should be redirected to homepage
    cy.url().should("include", "/pro");

    // our auth cookie should be present
    cy.getCookie("sessionid").should("exist");

    // navigate to account settings
    cy.get("#dropdownMenuLink").should("be.visible").click();
    cy.get("a").contains("Manage Account").click();

    // UI should reflect this user being logged in
    cy.get("input[name=first_name]").should("have.value", this.user.first_name);
  });
});
