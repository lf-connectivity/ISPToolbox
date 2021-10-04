import { MARKET_EVAL_PAGE } from "../../support";

context("Market Evaluator map layers", () => {
  before(() => {
    cy.fixture("session_fixture").then((session) => {
      cy.visit(MARKET_EVAL_PAGE);
      cy.wait_mapbox();
      cy.close_disclaimer();
      cy.close_nux();
      cy.set_session_map_preferences(session.final_center, session.final_zoom);
      cy.reload();
      cy.wait_mapbox();
      cy.wait(1000);
      cy.toggle_map_layer_sidebar();
    });
  });

  it("click on map layer", () => {
    cy.market_eval_toggle_geo_overlay(OVERLAY_RDOF);
  });
});
