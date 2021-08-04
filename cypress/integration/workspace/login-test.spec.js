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
    cy.visit("/pro");
    cy.get("a").contains("Sign in").click();

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

  it("Create Account Email Test", function () {
    cy.visit("/pro");

    cy.get("a").contains("with Email").click();

    // Create an Account
    cy.get("input[name=email]").type(this.user_signup.email);
    cy.get("input[name=first_name]").type(this.user_signup.first_name);
    cy.get("input[name=last_name]").type(this.user_signup.last_name);
    cy.get("input[name=password1]").type(this.user_signup.password1);
    cy.get("input[name=password2]").type(this.user_signup.password2);
    cy.get("input[name=registration_code]").type(
      this.user_signup.registration_code
    );
    cy.get("input[type=submit]").contains("Sign Up").click();

    // we should be redirected to homepage
    cy.url().should("include", "/pro");

    // our auth cookie should be present
    cy.getCookie("sessionid").should("exist");

    // naviate to account settings
    cy.get("#dropdownMenuLink").should("be.visible").click();
    cy.get("a").contains("Manage Account").click();

    // UI should reflect this user being logged in
    cy.get("input[name=first_name]").should(
      "have.value",
      this.user_signup.first_name
    );
  });
});
