/// <reference types="cypress" />

import {
  MARKET_EVAL_PAGE,
  MARKET_EVAL_SOURCES_PAGE,
  MARKET_EVAL_LOGGED_OUT_PAGE,
  LOS_CHECK_PAGE,
  LOS_CHECK_SOURCES_PAGE,
  LOS_CHECK_LOGGED_OUT_PAGE,
  LOGIN_PAGE,
  TERMS_PAGE,
  COOKIE_POLICY_PAGE,
  DATA_POLICY_PAGE,
  DASHBOARD_PAGE,
  MANAGE_ACCOUNT_PAGE,
  LATEST_LIDAR_PAGE,
  DESKTOP_SIZE,
  TABLET_SIZE,
  MOBILE_SIZE,
} from "../../support";

context("Navbar desktop size logged in views", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP_SIZE);
    cy.login();
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
    cy.close_nux();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("be.visible.with.icon")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("be.visible.with.correct_items")
      .navbar_account_dropdown_should("be.logged_in_view");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.close_nux();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("be.visible.with.icon")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("be.visible.with.correct_items")
      .navbar_account_dropdown_should("be.logged_in_view");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Manage Account page Navbar", () => {
    cy.visit(MANAGE_ACCOUNT_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Dashboard page Navbar", () => {
    cy.visit(DASHBOARD_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_in_view");
  });
});

context("Navbar tablet size logged in views", () => {
  beforeEach(() => {
    cy.viewport(TABLET_SIZE);
    cy.login();
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_in_view");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_in_view");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Manage Account page Navbar", () => {
    cy.visit(MANAGE_ACCOUNT_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Dashboard page Navbar", () => {
    cy.visit(DASHBOARD_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_in_view");
  });
});

context("Navbar mobile size logged in views", () => {
  beforeEach(() => {
    cy.viewport(MOBILE_SIZE);
    cy.login();
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("be.visible.and.work_properly")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Manage Account page Navbar", () => {
    cy.visit(MANAGE_ACCOUNT_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Dashboard page Navbar", () => {
    cy.visit(DASHBOARD_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });
});

context("Navbar desktop size logged out views", () => {
  beforeEach(() => {
    cy.viewport(DESKTOP_SIZE);
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("be.visible.with.icon")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_out_view");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });
});

context("Navbar tablet size logged out views", () => {
  beforeEach(() => {
    cy.viewport(TABLET_SIZE);
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("be.logged_out_view");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });
});

context("Navbar mobile size logged out views", () => {
  beforeEach(() => {
    cy.viewport(MOBILE_SIZE);
  });

  it("Market Evaluator Navbar", () => {
    cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Market Evaluator")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("LOS Check Navbar", () => {
    cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
    cy.wait_mapbox();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "LOS Check")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sources pages Navbars", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("be.visible.with.text", "Sources")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Sign-in page Navbar", () => {
    cy.visit(LOGIN_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    // Need to do this to clarify to Cypress which link to click on
    cy.get("div#signin_container").contains("Sign Up").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.get("div#fb_sign_up_container").contains("Sign Up with Email").click();
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Legal pages Navbar", () => {
    cy.visit(TERMS_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(COOKIE_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");

    cy.visit(DATA_POLICY_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("new_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("be.visible.with.correct_text")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });

  it("Latest LiDAR Updates Navbar (old navbar, will update with redesign launch)", () => {
    cy.visit(LATEST_LIDAR_PAGE);
    cy.get_navbar()
      .navbar_back_button_should("not.exist.or.not.be.visible")
      .navbar_logo_should_be("old_logo")
      .navbar_title_should("not.exist.or.not.be.visible")
      .navbar_tool_help_button_should("not.exist.or.not.be.visible")
      .navbar_beta_flag_should("not.exist.or.not.be.visible")
      .navbar_workspace_dropdown_should("not.exist.or.not.be.visible")
      .navbar_account_dropdown_should("not.exist.or.not.be.visible");
  });
});
