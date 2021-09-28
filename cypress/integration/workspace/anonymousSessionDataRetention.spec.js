/// <reference types="cypress" />

import {
  LOS_CHECK_LOGGED_OUT_PAGE,
  MARKET_EVAL_LOGGED_OUT_PAGE,
  MARKET_EVAL_PAGE,
} from "../../support";

const MARKET_EVAL_INITIAL_MAP_NO_ITEMS =
  "anonymous_session_initial_map_market_eval_no_items";
const LOS_CHECK_INITIAL_MAP_NO_ITEMS =
  "anonymous_session_initial_map_los_check_no_items";
const MARKET_EVAL_FINAL_MAP_NO_ITEMS =
  "anonymous_session_final_map_market_eval_no_items";
const LOS_CHECK_FINAL_MAP_NO_ITEMS =
  "anonymous_session_final_map_los_check_no_items";

// Function to automatically do baseline generation or actual test running depending
// on a flag you should set manually. Place the generated screenshots into
// cypress/snapshots/base to set up/update the baseline screenshots. To generate
// the baseline screenshots, run the following:
//
// npx cypress run --env type=base --spec <this file>
//
// This should only be ran as a dev to change the screenshot specs.
function anonymousSessionDataRetentionFlow() {
  if (Cypress.env("type") === "base") {
    return context(
      "Anonymous session data retention baseline screenshot generation",
      () => {
        it("Market Evaluator baseline screenshots", () => {
          cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
          cy.wait_mapbox();
          cy.close_disclaimer();
          cy.close_nux();
          // Since we set the type env to base, this takes the screenshots and
          // doesn't compare them.
          cy.get("#map").compareSnapshot(MARKET_EVAL_INITIAL_MAP_NO_ITEMS);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(MARKET_EVAL_FINAL_MAP_NO_ITEMS);
        });
        
        it("LOS Check baseline screenshots", () => {
          cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
          cy.wait_mapbox();
          cy.close_disclaimer();
          cy.close_nux();
          cy.get("#map").compareSnapshot(LOS_CHECK_INITIAL_MAP_NO_ITEMS);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(LOS_CHECK_FINAL_MAP_NO_ITEMS);
        });
      }
      );
    } else {
      return context("Anonymous session data retention", () => {
        it("Market Evaluator should preserve session zoom info and center", () => {
          cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
          cy.wait_mapbox();
          cy.close_disclaimer();
          cy.close_nux();
          cy.get("#map").compareSnapshot(MARKET_EVAL_INITIAL_MAP_NO_ITEMS);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(MARKET_EVAL_FINAL_MAP_NO_ITEMS);
        });
        
        it("LOS Check should preserve session zoom info and center screenshots", () => {
          cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
          cy.wait_mapbox();
          cy.close_disclaimer();
          cy.close_nux();
          cy.get("#map").compareSnapshot(LOS_CHECK_INITIAL_MAP_NO_ITEMS);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(LOS_CHECK_FINAL_MAP_NO_ITEMS);
        });
        
        it("Market Evaluator should remove all items when reloading an anonymous session", () => {
          cy.visit(MARKET_EVAL_LOGGED_OUT_PAGE);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.market_eval_add_other_tower();
          cy.wait(1000);
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(MARKET_EVAL_FINAL_MAP_NO_ITEMS);
        });
        
        it("LOS Check should remove all items when reloading an anonymous session", () => {
          cy.visit(LOS_CHECK_LOGGED_OUT_PAGE);
          cy.set_session_map_preferences();
          cy.reload();
          cy.wait_mapbox();
          cy.los_add_other_tower();
          cy.wait(1000);
          cy.reload();
          cy.wait_mapbox();
          cy.get("#map").compareSnapshot(LOS_CHECK_FINAL_MAP_NO_ITEMS);
        });
      });
    }
  }
  
  anonymousSessionDataRetentionFlow();
  
