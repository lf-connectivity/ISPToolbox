/// <reference types="cypress" />

import { MARKET_EVAL_PAGE } from "../../support";

context("Market Evaluator Info Tooltips", () => {
  before(() => {
    cy.visit(MARKET_EVAL_PAGE);
    cy.wait_mapbox();
    cy.close_disclaimer();
    cy.close_nux();
    cy.los_toggle_map_layer_sidebar();
  });

  afterEach(() => {
    // Hide tooltips
    cy.get("#map").click();
  });

  it("The Buildings inside Coverage Area tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Buildings inside Coverage Area",
      "Buildings inside Coverage Area",
      "This is a count of rooftops identified in your selected area; rooftops may include homes, businesses, unoccupied structures, etc.",
      ["https://github.com/Microsoft/USBuildingFootprints"]
    );
  });

  it("The Potential Market Penetration tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Potential Market Penetration",
      "Potential Market Penetration",
      "This number represents the percentage of buildings (i.e. rooftops) that you forecast may subscribe to your service. You can change the percentage based on your determined estimated market penetration and existing market conditions."
    );
  });

  it("The Potential Leads tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Potential Leads",
      "Potential Leads",
      "This number represents the number buildings you could potentially service based on our evaluator. This is calculated by multiplying the number of Buildings Inside Coverage Area by the Market Penetration percentage."
    );
  });

  it("The Population tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Population",
      "Population",
      "Estimated population of selected area. Based on satellite imagery and census data.",
      [
        "https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates",
      ]
    );
  });

  it("The Building Density tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Building Density",
      "Building Density",
      "The number of buildings in your selected area as buildings per mile squared."
    );
  });

  it("The Service Providers tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Service Providers",
      "Service Providers",
      "This is the number of Service Providers in the selected coverage area. Service Providers are listed in the order of their advertised speeds if available.",
      ["https://www.fcc.gov/general/broadband-deployment-data-fcc-form-477"]
    );
  });

  it("The Median Speeds tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Median Speeds",
      "Median Speeds",
      "The data presented is download/upload Mbps. Speed test results are a weighted average over zipcode medians if multiple zip/postal codes are selected.",
      [
        "https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information",
      ]
    );
  });

  it("The Avg. Household Income tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Avg. Household Income",
      "Avg. Household Income",
      "The average household income in the selected area, weighted by the total of buildings. Data does not reflect the income of individual households.",
      ["https://www.census.gov/programs-surveys/acs"]
    );
  });

  it("The RDOF tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "FCC Rural Digital Opportunity Fund",
      "FCC Rural Digital Opportunity Fund (Closed)",
      "The FCC has identified the highlighted areas that are preliminarily determined to be eligible for the Rural Digital Opportunity Fund Phase III auction (Auction 904).",
      ["https://www.fcc.gov/auction/904"]
    );
  });

  it("The Census Blocks tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Census Blocks",
      "Census Blocks",
      "This overlay outlines census blocks. These geographic areas are statistical areas bounded by visible features, such as streets, roads, streams, and railroad tracks, and by non visible boundaries, such as selected property lines and city, township, school district, and county limits and short line-of-sight extensions of streets and roads. See the data source to learn more.",
      [
        "https://www.census.gov/programs-surveys/geography/about/glossary.html#par_textimage_5",
      ]
    );
  });

  it("The Non-urban tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Non-urban < 10/1 Mbps",
      "Non-urban < 10/1 Mbps",
      "Zipcode areas not including 'Urban Areas' or 'Urban Clusters' as defined by the US Census Bureau with median speed measured at less than 10/1 Mbps (Download/Upload) provided by M-Lab.",
      [
        [
          "See M-Lab Source",
          "https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information",
        ],
        [
          "See Census Source",
          "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
        ],
      ]
    );
  });

  it("The CBRS tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "CBRS PAL Holders",
      "CBRS PAL Holders",
      "US Census counties and companies that hold CBRS Priority Access Licenses from FCC Auction 105",
      [
        "https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license",
      ]
    );
  });

  it("The Tribal tooltip should be correct", () => {
    cy.market_eval_info_tooltip_should_be(
      "Tribal Lands",
      "Tribal Lands",
      "The Census Bureau conducts the Boundary and Annexation Survey (BAS) yearly to update and maintain information about legal boundaries, names and official status of federally recognized American Indian reservations and/or off-reservation trust lands, as well as counties, incorporated places and minor civil divisions.",
      [
        "https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2020&layergroup=American+Indian+Area+Geography",
      ]
    );
  });
});
