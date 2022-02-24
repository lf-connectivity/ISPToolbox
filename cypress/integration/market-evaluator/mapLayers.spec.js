import {
  DESKTOP_SIZE,
  MARKET_EVAL_PAGE,
  OVERLAY_RDOF,
  OVERLAY_CENSUS,
  OVERLAY_COMMUNITY_CONNECT,
  TOWER_ICON,
  COVERAGE_AREA_ICON,
  OVERLAY_CBRS,
  SOURCE_RDOF,
  SOURCE_CBRS,
  SOURCE_CENSUS,
  SOURCE_COMMUNITY_CONNECT,
  SOURCE_TRIBAL,
  OVERLAY_TRIBAL,
} from "../../support";

function geoOverlayLayerTestCase(
  overlay,
  source,
  point_1,
  point_2,
  expected_area_prefix
) {
  return () => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.market_eval_toggle_geo_overlay(overlay);
      cy.map_get_sources().should("include", source);

      // Create map layer objects
      cy.click_point_on_map(session[point_1]);

      // Wait for map layer objects to be created
      cy.click_point_on_map(session[point_2]);
      cy.market_eval_toggle_geo_overlay(overlay);
      cy.map_get_sources().should("not.include", source);

      // Assert map layer
      cy.get_user_map_layers_object(`${expected_area_prefix}`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`${expected_area_prefix}`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
    });
  };
}

context("Market Evaluator map layers (also covers LOS map layers)", () => {
  before(() => {
    cy.fixture("map_layers_session_fixture").then((session) => {
      cy.visit(MARKET_EVAL_PAGE);
      cy.wait_mapbox();
      cy.close_disclaimer();
      cy.close_nux();
      cy.set_session_map_preferences(session.center, session.zoom);
    });
  });

  beforeEach(() => {
    cy.preserve_session_cookie();
    cy.reload();
    cy.wait_mapbox();
    cy.toggle_map_layer_sidebar();
  });

  it("Verify functionality of maplayers component", () => {
    "Empty map should display a message under 'Your Layers'"
    cy.user_map_layers_should_be_empty();
    // Initial state should not display any overlays
    cy.map_get_sources().should("not.have.members", [
      SOURCE_RDOF,
      SOURCE_CBRS,
      SOURCE_CENSUS,
      SOURCE_COMMUNITY_CONNECT,
      SOURCE_TRIBAL,
    ]);
    // Toggling one geo overlay layer unrenders every other geo overlay layer.
    let testGeoOverlay = (overlay, source) => {
        let sources = new Set([
          SOURCE_RDOF,
          SOURCE_CBRS,
          SOURCE_CENSUS,
          SOURCE_COMMUNITY_CONNECT,
          SOURCE_TRIBAL,
        ]);
        sources.delete(source);
  
        let expected_nonexistent_sources = Array.from(sources);
  
        cy.market_eval_toggle_geo_overlay(overlay);
        cy.map_get_sources()
          .should("include", source)
          .should("not.have.members", expected_nonexistent_sources);
      };
  
      [
        [OVERLAY_RDOF, SOURCE_RDOF],
        [OVERLAY_CBRS, SOURCE_CBRS],
        [OVERLAY_CENSUS, SOURCE_CENSUS],
        [OVERLAY_COMMUNITY_CONNECT, SOURCE_COMMUNITY_CONNECT],
        [OVERLAY_TRIBAL, SOURCE_TRIBAL],
      ].forEach((pair) => {
        testGeoOverlay(pair[0], pair[1]);
      });
      cy.fixture("map_layers_session_fixture").then((session) => {
        cy.draw_coverage_area(session.coverage_area_1);
        cy.draw_coverage_area(session.coverage_area_2);
  
        cy.get_user_map_layers_object(`Area`)
          .should("be.visible")
          .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
  
        cy.get_user_map_layers_object(`Area`)
          .should("be.visible")
          .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
      });

    // "RDOF map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(
      OVERLAY_RDOF,
      SOURCE_RDOF,
      "rdof_1",
      "rdof_2",
      "RDOF"
    )();

    // "Census map layers should be named and numbered correctly",
    geoOverlayLayerTestCase(
      OVERLAY_CENSUS,
      SOURCE_CENSUS,
      "census_1",
      "census_2",
      "Census Block"
    )();

  // it("User map layers should have the proper icon and name for towers", () => {
    cy.viewport(DESKTOP_SIZE);
    cy.fixture("map_layers_session_fixture").then((session) => {
        cy.place_tower(session.tower);
      });
    cy.get_user_map_layers_object("Unnamed Tower")
      .should("be.visible")
      .should_have_user_map_layer_icon(TOWER_ICON);

//   it("Mixed geo overlay types should use separate numbering", () => {
    cy.fixture("map_layers_session_fixture").then((session) => {

      cy.get_user_map_layers_object(`RDOF `)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`RDOF `)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Census Block`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Area`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);

      cy.get_user_map_layers_object(`Area`)
        .should("be.visible")
        .should_have_user_map_layer_icon(COVERAGE_AREA_ICON);
    });

  // it("toggling features hidden / unhidden", () => {

    // "Hiding a tower should keep the point on the map, while not rendering the radius"
    cy.draw_get_features().should("have.length", 5);

    cy.get_user_map_layers_object(
      "Unnamed Tower"
    ).toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 5);

    cy.get_user_map_layers_object(
      "Unnamed Tower"
    ).toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 5);

//   it("Hiding a coverage area should remove it from the map temporarily", () => {

    cy.draw_get_features().should("have.length", 5);

    cy.get_user_map_layers_object("Area 1").toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 5);

    cy.get_user_map_layers_object("Area 1").toggle_user_map_layers_feature();
    cy.draw_get_features().should("have.length", 5);
    // TODO check hidden property of toggled components
  });
});
