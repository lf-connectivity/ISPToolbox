/// <reference types="cypress" />

import {
  MARKET_EVAL_PAGE,
  LOS_CHECK_PAGE,
  FOOTNOTES_SECTION,
  MARKET_EVAL_SOURCES_PAGE,
  LOS_CHECK_SOURCES_PAGE,
} from "../../support";

context("Sources checks for Market Evaluator", () => {
  before(() => {
    cy.login();
  });

  beforeEach(() => {
    cy.preserve_session_cookie();
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
  });

  it("Clicking Sources in Market Evaluator page brings up sources page", () => {
    // Test that source link opens in new tab, and is in mapbox
    cy.wait_mapbox();
    cy.get("#map")
      .contains("a", "Sources")
      .should("have.attr", "target", "_blank")
      .should("have.attr", "href", MARKET_EVAL_SOURCES_PAGE);
  });

  it("Clicking citation links in Market Evaluator pages should bring up sources page with right highlight", () => {
    // Test that each citation highlights the correct footnote.
    cy.get("sup").each((sup) => {
      let match = sup.text().match(/\d+/);
      let num = match[0];
      let links = sup.find("a");
      if (links.length > 0) {
        cy.wrap(links[0])
          .should("have.attr", "target", "_blank")
          .should(
            "have.attr",
            "href",
            `${MARKET_EVAL_SOURCES_PAGE}#${FOOTNOTES_SECTION}-${num}`
          );
      }
    });
  });


  it("The service provider citation should be correct", () => {
    cy.get_footnote_by_text("Service Providers")
      .footnote_text_should_match(
        /^Service Provider data is obtained via Federal Communications Commission \(FCC\): Form 477 June 2020\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "Federal Communications Commission (FCC): Form 477",
        "https://www.fcc.gov/general/broadband-deployment-data-fcc-form-477"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });
});

context("Sources checks for LOS", () => {
  before(() => {
    cy.login();
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.close_disclaimer();
    cy.close_nux();
    cy.wait(1000);
  });

  afterEach(() => {
    cy.preserve_session_cookie();
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.wait(1000);
  });

  it("Click Sources in LOS Check page brings up sources page", () => {
    // Test that source link opens in new tab, and is in mapbox
    cy.get("#map")
      .contains("a", "Sources")
      .should("have.attr", "target", "_blank")
      .should("have.attr", "href", LOS_CHECK_SOURCES_PAGE);
  });

  it("Radio tooltip in LOS Check page has the correct citation for Mapbox Geocoding", () => {
    cy.los_click_radio();

    // Tooltip should be visible
    cy.get("#map").get("div.tooltip--cpe").should("be.visible");

    // Click the citation in the street address portion
    cy.get_footnote("#map div.tooltip--cpe:first div.description:first p:first")
      .footnote_text_should_match(
        /^Address data obtained via Mapbox's Geocoding API\.$/
      )
      .footnote_should_have_link("Mapbox", "https://www.mapbox.com/about/maps");
  });
});

context("Miscellaneous uncited sources", () => {
  it("The LOS Check lidar data source should be correct", () => {
    cy.visit(LOS_CHECK_SOURCES_PAGE);
    cy.get(`#${FOOTNOTES_SECTION}`)
      .footnote_text_should_match(
        /USGS 3DEP LiDAR Data obtained via USGS 3DEP LiDAR Point Clouds AWS Public Dataset\. Last updated date can be found in the legend tooltip\. Check for new LiDAR updates\. Clear or obstructed LiDAR data depends on changes in foliage or other obstructions\./
      )
      .footnote_should_have_link(
        "USGS 3DEP LiDAR Data",
        "https://www.usgs.gov/core-science-systems/ngp/3dep"
      )
      .footnote_should_have_link(
        "USGS 3DEP LiDAR Point Clouds AWS Public Dataset",
        "https://registry.opendata.aws/usgs-lidar/"
      )
      .footnote_should_have_link("new LiDAR updates", "/demo/latest-gis-data/");
  });
});
