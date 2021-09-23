/// <reference types="cypress" />

import {
  MARKET_EVAL_PAGE,
  LOS_CHECK_PAGE,
  FOOTNOTES_SECTION,
  MARKET_EVAL_SOURCES_PAGE,
  LOS_CHECK_SOURCES_PAGE,
} from "../../support";

context("Sources checks for Market Evaluator", () => {
  beforeEach(() => {
    cy.login();
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
  });

  it("Clicking Sources in Market Evaluator page brings up sources page", () => {
    // Test that source link opens in new tab, and is in mapbox
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

  it("The building citation should be correct", () => {
    cy.get_footnote_by_text("Buildings inside Coverage Area")
      .footnote_text_should_match(
        /^Building estimates information from Microsoft US Building Footprints\, July 2018, which is made available here under the Open Data Commons Open Database License \(ODbL\)\. \[Last Updated [a-zA-Z]{3} \d{4}\]\. Puerto Rico Building outlines courtesy of © OpenStreetMap contributors under the Open Data Commons Open Database License \(ODbL\)\.$/
      )
      .footnote_should_have_link(
        "Microsoft US Building Footprints, July 2018",
        "https://github.com/Microsoft/USBuildingFootprints"
      )
      .footnote_should_have_link(
        "© OpenStreetMap contributors",
        "https://www.openstreetmap.org/copyright"
      )
      .footnote_should_have_link(
        "Open Data Commons Open Database License (ODbL)",
        "https://opendatacommons.org/licenses/odbl/"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The population citation should be correct", () => {
    cy.get_footnote_by_text("Population")
      .footnote_text_should_match(
        /^Facebook Connectivity Lab and Center for International Earth Science Information Network \- CIESIN \- Columbia University\. 2016\. High Resolution Settlement Layer \(HRSL\)\. Source imagery for HRSL © 2016 DigitalGlobe\. Accessed \d{1,2} [a-zA-Z]+ \d{4}\.$/
      )
      .footnote_should_have_link(
        "High Resolution Settlement Layer",
        "https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
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

  it("The median speeds citation should be correct", () => {
    cy.get_footnote_by_text("Median Speeds")
      .footnote_text_should_match(
        /^The M-Lab NDT Dataset\, [a-zA-Z]{3} \d{4}\. https:\/\/www\.measurementlab\.net\/tests\/ndt$/
      )
      .footnote_should_have_link(
        "https://www.measurementlab.net/tests/ndt",
        "https://www.measurementlab.net/tests/ndt"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The average household income citation should be correct", () => {
    cy.get_footnote_by_text("Avg. Household Income")
      .footnote_text_should_match(
        /^Household income data is obtained via US Census Bureau: American Community Survey 2019\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "US Census Bureau: American Community Survey 2019",
        "https://www.census.gov/programs-surveys/acs"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The RDOF citation should be correct", () => {
    cy.get_footnote_by_text("FCC Rural Digital Opportunity Fund")
      .footnote_text_should_match(
        /^FCC Rural Digital Opportunity Fund \(RDOF\) data is obtained via FCC Auction 904\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "FCC Auction 904",
        "https://www.fcc.gov/auction/904"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The census blocks citation should be correct", () => {
    cy.get_footnote_by_text("Census Blocks")
      .footnote_text_should_match(
        /^Census Block data was obtained from US 2020 Census Data from Census Tiger\/Line® Shapefiles\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "Census Tiger/Line® Shapefiles",
        "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The non-urban citation should be correct", () => {
    cy.get_footnote_by_text("Non-urban < 10/1 Mbps")
      .footnote_text_should_match(
        /^\"Urban Areas\" and \"Urban Clusters\" defined by the US Census Bureau\'s UA10 \"Urban Areas\" dataset\, 2019\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        'US Census Bureau\'s UA10 "Urban Areas" dataset, 2019',
        "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The CBRS citation should be correct", () => {
    cy.get_footnote_by_text("CBRS PAL Holders")
      .footnote_text_should_match(
        /^FCC CBRS PAL data from FCC Auction 105\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "FCC Auction 105",
        "https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });

  it("The tribal citation should be correct", () => {
    cy.get_footnote_by_text("Tribal Lands")
      .footnote_text_should_match(
        /^Tribal Lands data was obtained from US 2020 Census Data from Census Tiger\/Line® Shapefiles\. \[Last Updated [a-zA-Z]{3} \d{4}\]$/
      )
      .footnote_should_have_link(
        "Census Tiger/Line® Shapefiles",
        "https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2020&layergroup=American+Indian+Area+Geography"
      );

    cy.url().should("include", MARKET_EVAL_SOURCES_PAGE);
  });
});

context("Sources checks for LOS", () => {
  beforeEach(() => {
    cy.login();
    cy.visit(LOS_CHECK_PAGE);
    cy.wait_mapbox();
    cy.close_nux();
  });

  it("Click Sources in LOS Check page brings up sources page", () => {
    // Test that source link opens in new tab, and is in mapbox
    cy.get("#map")
      .contains("a", "Sources")
      .should("have.attr", "target", "_blank")
      .should("have.attr", "href", LOS_CHECK_SOURCES_PAGE);
  });

  it("Radio tooltip in LOS Check page has the correct citation for Mapbox Geocoding", () => {
    cy.wait(2000);
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
  it("The Market Evaluator Cloud RF source should be correct", () => {
    cy.visit(MARKET_EVAL_SOURCES_PAGE);
    cy.get(`#${FOOTNOTES_SECTION}`)
      .footnote_text_should_match(
        /High-level line of sight is obtained via Cloud-RF\. \(resolution is ~30m x 30m\)\. Data as of 2003\./
      )
      .footnote_should_have_link("Cloud-RF", "https://cloudrf.com/api/");
  });

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
