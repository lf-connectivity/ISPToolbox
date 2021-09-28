/// <reference types="cypress" />


function reverseCoordinatesToCanvas(coordinates){
  cy.window().then((window)=>{
    const coords = window.mapbox_handles.map.project(coordinates);
    cy.get('#map').click(coords.x, coords.y);
  })
}
  
Cypress.Commands.add(
  "los_click_tower",
  () => {
    cy.fixture("session_fixture").then((session)=>{
      reverseCoordinatesToCanvas(session.tower);
    })
  }
);
  
Cypress.Commands.add(
    "los_click_radio",
    () => {
      cy.fixture("session_fixture").then((session)=>{
        reverseCoordinatesToCanvas(session.cpe);
      })
    }
);

Cypress.Commands.add(
  "los_click_building",
  () => {
    cy.fixture("session_fixture").then((session)=>{
      reverseCoordinatesToCanvas(session.building);
    })
  }
);

Cypress.Commands.add(
  "los_add_other_tower",
  () => {
    cy.get("#add-ap-btn").click();
    cy.wait(1000);
    cy.fixture("session_fixture").then((session)=>{
      reverseCoordinatesToCanvas(session.add_tower);
    })
  }
);

Cypress.Commands.add(
  "los_delete_other_tower",
  () => {
    cy.fixture("session_fixture").then((session)=>{
      reverseCoordinatesToCanvas(session.add_tower);
      cy.wait(1000);
      cy.get("button.mapbox-gl-draw_trash").click();
      cy.wait(1000);
    });
  }
);

Cypress.Commands.add("los_toggle_link_profile", () => {
  cy.get("div.link-view-bar div.collapse-button:first a:first").click();
  cy.wait(500);
});

Cypress.Commands.add("los_toggle_map_layer_sidebar", () => {
  cy.get("button#map-layers-btn").click();
  cy.wait(500);
});

Cypress.Commands.add("los_get_link_profile", () => {
  cy.get("div#data-container");
});

Cypress.Commands.add("los_get_mapbox_tooltip", () => {
  cy.get("div.mapboxgl-popup-content");
});

Cypress.Commands.add("los_get_map_layer_sidebar", () => {
  cy.get("div#map-layer-sidebar");
});
