import {
  DESKTOP_SIZE,
  MARKET_EVAL_PAGE,
  OVERLAY_RDOF,
  OVERLAY_CENSUS,
  OVERLAY_COMMUNITY_CONNECT,
  TOWER_ICON,
  COVERAGE_AREA_ICON,
  OVERLAY_CBRS,
} from "../../support";

function geoOverlayLayerTestCase(
  overlay,
  point_1,
  point_2,
  expected_area_prefix
) {
  return () => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.market_eval_toggle_geo_overlay(overlay);

      // Create map layer objects
      cy.click_point_on_map(session[point_1]);

      // Wait for map layer objects to be created
      cy.wait(1500);
      cy.click_point_on_map(session[point_2]);
      cy.wait(1500);
      cy.market_eval_toggle_geo_overlay(overlay);

      // Assert map layer
      cy.get_user_map_layers_object(`${expected_area_prefix} 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`${expected_area_prefix} 2`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
    });
  };
}

context("Market Evaluator map layers (also covers LOS map layers)", () => {
  before(() => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.viewport(DESKTOP_SIZE);
      cy.visit(MARKET_EVAL_PAGE);
      cy.wait_mapbox();
      cy.close_disclaimer();
      cy.close_nux();
      cy.set_session_map_preferences(session.center, session.zoom);
    });
  });

  beforeEach(() => {
    cy.preserve_session_cookie();
    cy.viewport(DESKTOP_SIZE);
    cy.reload();
    cy.wait_mapbox();
    cy.toggle_map_layer_sidebar();
  });

  it("Empty map should display a message under 'Your Layers'", () => {
    cy.user_map_layers_should_be_empty();
  });

  it("Drawing coverage areas should have the proper names/numbers", () => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.draw_coverage_area(session.coverage_area_1);
      cy.wait(500);
      cy.draw_coverage_area(session.coverage_area_2);

      cy.get_user_map_layers_object(`Area 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Area 2`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
    });
  });

  it(
    "RDOF map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(OVERLAY_RDOF, "rdof_1", "rdof_2", "RDOF Area")
  );

  it(
    "Census map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(
      OVERLAY_CENSUS,
      "census_1",
      "census_2",
      "Census Block"
    )
  );

  it(
    "Community Connect map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(
      OVERLAY_COMMUNITY_CONNECT,
      "community_connect_1",
      "community_connect_2",
      "Non-urban Area"
    )
  );

  it(
    "CBRS map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(OVERLAY_CBRS, "cbrs_1", "cbrs_2", "CBRS Area")
  );

  it("User map layers should have the proper icon and name for towers", () => {
    cy.market_eval_add_other_tower();
    cy.get_user_map_layers_object("Unnamed AP")
      .should("be.visible")
      .should_have_user_map_layer_icon(TOWER_ICON);
  });

  it("Mixed geo overlay types should use separate numbering", () => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      // Add RDOFs
      cy.market_eval_toggle_geo_overlay(OVERLAY_RDOF);
      cy.click_point_on_map(session.rdof_1);
      cy.wait(1500);
      cy.click_point_on_map(session.rdof_2);
      cy.wait(1500);
      cy.market_eval_toggle_geo_overlay(OVERLAY_RDOF);

      // Add 1 Census
      cy.market_eval_toggle_geo_overlay(OVERLAY_CENSUS);
      cy.click_point_on_map(session.census_1);
      cy.wait(1500);
      cy.market_eval_toggle_geo_overlay(OVERLAY_CENSUS);

      // Draw 2 coverage areas
      cy.draw_coverage_area(session.coverage_area_1);
      cy.wait(500);
      cy.draw_coverage_area(session.coverage_area_2);

      cy.get_user_map_layers_object(`RDOF Area 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`RDOF Area 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Census Block 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Area 1`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Area 2`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
    });
  });

  it("Hiding a tower should keep the point on the map, while not rendering the radius", () => {
    cy.market_eval_add_other_tower();

    // Wait until mapbox API finishes processing
    cy.wait(500);
    cy.draw_get_features().should("have.length", 1);
    cy.map_get_source_features("ap_vis_data_source").should("have.length", 1);

    cy.get_user_map_layers_object(
      "Unnamed AP"
    ).toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 1);
    cy.map_get_source_features("ap_vis_data_source").should("have.length", 0);

    cy.get_user_map_layers_object(
      "Unnamed AP"
    ).toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 1);
    cy.map_get_source_features("ap_vis_data_source").should("have.length", 1);
  });

  it("Hiding a coverage area should remove it from the map temporarily", () => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.draw_coverage_area(session.coverage_area_1);

      // Wait until mapbox API finishes processing
      cy.wait(500);
      cy.draw_get_features().should("have.length", 1);

      cy.get_user_map_layers_object("Area 1").toggle_user_map_layers_feature();
      cy.draw_get_features().should("have.length", 0);

      cy.get_user_map_layers_object("Area 1").toggle_user_map_layers_feature();
      cy.draw_get_features().should("have.length", 1);
    });
  });
});
