/// <reference types="cypress" />

/*
 * WARNING: THESE TESTS WILL FAIL TO A STIFF BREEZE!!! DO NOT TOUCH YOUR COMPUTER
 * AS THESE TESTS ARE BEING RUN!!! GRAB A CUP OF COFFEE INSTEAD!!!
 */

import { LOS_CHECK_PAGE, not_exist_or_not_be_visible } from "../../../support";

function reset() {
  cy.login();
  cy.visit(LOS_CHECK_PAGE);
  cy.wait_mapbox();
  cy.close_nux();
  cy.los_setup_tower_radio();
}

function testWorkflow(description, func, resetTest = false, only = false) {
  let retfunc = only ? it.only : it;
  if (!resetTest) {
    return retfunc(description, func);
  } else {
    return retfunc(description, () => {
      func();
      reset();
    });
  }
}

function mapboxStuffIntoLinkProfileViewTest(
  description,
  mapboxStuff,
  resetTest = false
) {
  return testWorkflow(
    description,
    () => {
      mapboxStuff();
      cy.los_get_mapbox_tooltip().should("be.visible");

      cy.los_toggle_link_profile();
      cy.los_get_link_profile().should("be.visible");

      // Using this assertion instead of be.visible because mapbox is a third party library
      // that does stuff to the DOM, and we only care about if it's hidden.
      cy.los_get_mapbox_tooltip().should(not_exist_or_not_be_visible);
    },
    resetTest,
    true
  );
}

function linkProfileIntoMapboxStuffTest(
  description,
  mapboxStuff,
  resetTest = false
) {
  return testWorkflow(
    description,
    () => {
      cy.los_toggle_link_profile();
      cy.los_get_link_profile().should("be.visible");

      mapboxStuff({ linkProfileOpen: true });
      cy.los_get_mapbox_tooltip().should("be.visible");
      cy.los_get_link_profile().should("not.be.visible");
    },
    resetTest
  );
}

function mapboxStuffIntoMapLayersSidebarTest(
  description,
  mapboxStuff,
  resetTest = false
) {
  return testWorkflow(
    description,
    () => {
      mapboxStuff();
      cy.los_get_mapbox_tooltip().should("be.visible");

      cy.los_toggle_map_layer_sidebar();
      cy.los_get_map_layer_sidebar().should("be.visible");
      cy.los_get_mapbox_tooltip().should("be.visible");
    },
    resetTest
  );
}

function mapLayersSidebarIntoMapboxStuffTest(
  description,
  mapboxStuff,
  resetTest = false
) {
  return testWorkflow(
    description,
    () => {
      cy.los_toggle_map_layer_sidebar();
      cy.los_get_map_layer_sidebar().should("be.visible");

      mapboxStuff({ mapLayersOpen: true });
      cy.los_get_mapbox_tooltip().should("be.visible");
      cy.los_get_map_layer_sidebar().should("be.visible");
    },
    resetTest
  );
}

// Not testing mapbox tooltips closing and reopening, because that's already tested by mapbox API.
context("LOS Check collapsible components", () => {
  before(() => {
    reset();
  });

  beforeEach(() => {
    Cypress.Cookies.preserveOnce("sessionid");
    cy.reload();
    cy.wait_mapbox();
    cy.wait(1500);
    cy.los_click_tower();
    cy.los_toggle_link_profile();
    cy.los_toggle_link_profile();
  });

  /* ====================================
   *  MAPBOX STUFF INTO LINK PROFILE VIEW TESTS
   * ====================================
   */

  mapboxStuffIntoLinkProfileViewTest(
    "Opening the link profile view when the tower tooltip is open should close the tower tooltip",
    cy.los_click_tower
  );

  mapboxStuffIntoLinkProfileViewTest(
    "Opening the link profile view when the radio tooltip is open should close the radio tooltip",
    cy.los_click_radio
  );

  mapboxStuffIntoLinkProfileViewTest(
    "Opening the link profile view after clicking on an empty building closes the building tooltip.",
    cy.los_click_building
  );

  mapboxStuffIntoLinkProfileViewTest(
    "Opening the link profile view after placing a new tower closes the tower tooltip.",
    cy.los_add_other_tower,
    true
  );

  /* ====================================
   *  LINK PROFILE VIEW INTO MAPBOX STUFF TESTS
   * ====================================
   */

  linkProfileIntoMapboxStuffTest(
    "Opening the tower tooltip when the link profile view is open should close the link profile view",
    cy.los_click_tower
  );

  linkProfileIntoMapboxStuffTest(
    "Opening the radio tooltip when the link profile view is open should close the link profile view",
    cy.los_click_radio
  );

  linkProfileIntoMapboxStuffTest(
    "Clicking on an empty building when the link profile view is open will close the link profile view.",
    cy.los_click_building
  );

  linkProfileIntoMapboxStuffTest(
    "Placing a new tower when the link profile view is open will close the link profile view",
    cy.los_add_other_tower,
    true
  );

  /* ====================================
   *  MAPBOX STUFF INTO MAP LAYER SIDEBAR TESTS
   * ====================================
   */

  mapboxStuffIntoMapLayersSidebarTest(
    "Opening the map layers sidebar when the tower tooltip is open will NOT close the tower tooltip.",
    cy.los_click_tower
  );

  mapboxStuffIntoMapLayersSidebarTest(
    "Opening the map layers sidebar when the radio tooltip is open will NOT close the radio tooltip.",
    cy.los_click_radio
  );

  mapboxStuffIntoMapLayersSidebarTest(
    "Opening the map layers sidebar after clicking on an empty building will NOT close the building tooltip.",
    cy.los_click_building
  );

  mapboxStuffIntoMapLayersSidebarTest(
    "Opening the map layers sidebar after placing a new tower will NOT close the tower tooltip.",
    cy.los_add_other_tower,
    true
  );

  /* ====================================
   *  MAP LAYER SIDEBAR INTO MAPBOX STUFF TESTS
   * ====================================
   */
  mapLayersSidebarIntoMapboxStuffTest(
    "Clicking on a tower when the map layers sidebar is open will NOT close the map layers sidebar",
    cy.los_click_tower
  );

  mapLayersSidebarIntoMapboxStuffTest(
    "Clicking on a radio when the map layers sidebar is open will NOT close the map layers sidebar",
    cy.los_click_radio
  );

  mapLayersSidebarIntoMapboxStuffTest(
    "Clicking on a building when the map layers sidebar is open will NOT close the map layers sidebar",
    cy.los_click_building
  );

  mapLayersSidebarIntoMapboxStuffTest(
    "Placing a new tower when the map layers sidebar is open will NOT close the map layers sidebar",
    cy.los_add_other_tower,
    true
  );

  /* ====================================
   *  LINK PROFILE + MAP LAYER TESTS
   * ====================================
   */

  it("Opening the link profile view when the map layers sidebar is open should close the sidebar", () => {
    cy.los_toggle_map_layer_sidebar();
    cy.los_get_map_layer_sidebar().should("be.visible");

    cy.los_toggle_link_profile();
    cy.los_get_link_profile().should("be.visible");
    cy.los_get_map_layer_sidebar().should("not.be.visible");
  });

  it("Opening the map layers sidebar when the link profile view is open should close the link profile view", () => {
    cy.los_toggle_link_profile();
    cy.los_get_link_profile().should("be.visible");

    cy.los_toggle_map_layer_sidebar();
    cy.los_get_link_profile().should("not.be.visible");
    cy.los_get_map_layer_sidebar().should("be.visible");
  });

  it("Opening the link profile view when a mapbox tooltip and the map layers sidebar is open will close everything but the link profile view.", () => {
    cy.los_toggle_map_layer_sidebar();
    cy.los_get_map_layer_sidebar().should("be.visible");

    cy.los_click_tower({ mapLayersOpen: true });
    cy.los_get_mapbox_tooltip().should("be.visible");
    cy.los_get_map_layer_sidebar().should("be.visible");

    cy.los_toggle_link_profile();
    cy.los_get_link_profile().should("be.visible");
    cy.los_get_map_layer_sidebar().should("not.be.visible");
    cy.los_get_mapbox_tooltip().should(not_exist_or_not_be_visible);
  });
});
