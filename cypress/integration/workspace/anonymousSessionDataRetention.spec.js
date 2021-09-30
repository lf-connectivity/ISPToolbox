/// <reference types="cypress" />

import {
  LOS_CHECK_LOGGED_OUT_PAGE,
  MARKET_EVAL_LOGGED_OUT_PAGE,
} from "../../support";

context("Anonymous session data retention", () => {
  it("Market Evaluator should preserve session zoom info and center", () => {
    cy.fixture("session_fixture").then((session) => {
      cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
      cy.wait_mapbox();
      cy.close_disclaimer();
      cy.close_nux();
      cy.map_center_and_zoom_should_be(
        session.initial_center,
        session.initial_zoom
      );
      cy.set_session_map_preferences(session.final_center, session.final_zoom);
      cy.reload();
      cy.wait_mapbox();
      cy.map_center_and_zoom_should_be(
        session.final_center,
        session.final_zoom
      );
    });
  });

  it("LOS Check should preserve session zoom info and center", () => {
    cy.fixture("session_fixture").then((session) => {
      cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
      cy.wait_mapbox();
      cy.close_disclaimer();
      cy.close_nux();
      cy.map_center_and_zoom_should_be(
        session.initial_center,
        session.initial_zoom
      );
      cy.set_session_map_preferences(session.final_center, session.final_zoom);
      cy.reload();
      cy.wait_mapbox();
      cy.map_center_and_zoom_should_be(
        session.final_center,
        session.final_zoom
      );
    });
  });

  it("Market Evaluator should remove all items when reloading an anonymous session", () => {
    cy.fixture("session_fixture").then((session) => {
      cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
      cy.set_session_map_preferences(session.final_center, session.final_zoom);
      cy.reload();
      cy.wait_mapbox();
      cy.market_eval_add_other_tower();
      cy.wait(1000);
      cy.reload();
      cy.wait_mapbox();
      cy.draw_features_should("be.empty");
    });
  });

  it("LOS Check should remove all items when reloading an anonymous session", () => {
    cy.fixture("session_fixture").then((session) => {
      cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
      cy.set_session_map_preferences(session.final_center, session.final_zoom);
      cy.reload();
      cy.wait_mapbox();
      cy.los_add_other_tower();
      cy.wait(1000);
      cy.reload();
      cy.wait_mapbox();
      cy.draw_features_should("be.empty");
    });
  });
});
