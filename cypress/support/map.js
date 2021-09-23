/// <reference types="cypress" />

// Sets session map preferences. Center should be an array of at least 2 elements,
// the first being longitude, and the second being latitude (everything ins lng lat in GIS)
// Zoom should be a float.
Cypress.Commands.add(
  "set_session_map_preferences",
  (center = [-86.5817861024335, 36.80733577508586], zoom = 15.74) => {
    cy.window().then((window) => {
      let body = {
        center: `SRID=4326;POINT (${center[0]} ${center[1]})`,
        zoom: zoom,
      };
      let sessionId = window.ISPTOOLBOX_SESSION_INFO.networkID;
      cy.request("PATCH", `/pro/workspace/api/session/${sessionId}/`, body);
    });
  }
);
