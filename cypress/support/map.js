/// <reference types="cypress" />

const CENTER_THRESHOLD = 1e-6;
const ZOOM_THRESHOLD = 1e-3;

// Sets session map preferences. Center should be an array of at least 2 elements,
// the first being longitude, and the second being latitude (everything ins lng lat in GIS)
// Zoom should be a float.
Cypress.Commands.add("set_session_map_preferences", (center, zoom) => {
  cy.window().then((window) => {
    let body = {
      center: `SRID=4326;POINT (${center[0]} ${center[1]})`,
      zoom: zoom,
    };
    let sessionId = window.ISPTOOLBOX_SESSION_INFO.networkID;
    cy.request("PATCH", `/pro/workspace/api/session/${sessionId}/`, body);
  });
});

Cypress.Commands.add(
  "click_point_on_map",
  (coordinates, coord_y = undefined) => {
    let xy;
    if (typeof coordinates === "number") {
      xy = [coordinates, coord_y];
    } else {
      xy = coordinates;
    }

    cy.window().then((window) => {
      const coords = window.mapbox_handles.map.project(xy);
      cy.get("#map").click(coords.x, coords.y);
    });
  }
);

Cypress.Commands.add("map_center_and_zoom_should_be", (center, zoom) => {
  cy.window().then((window) => {
    let mapCenter = window.mapbox_handles.map.getCenter();
    let mapZoom = window.mapbox_handles.map.getZoom();

    expect(mapCenter.lng).to.be.closeTo(center[0], CENTER_THRESHOLD);
    expect(mapCenter.lat).to.be.closeTo(center[1], CENTER_THRESHOLD);
    expect(mapZoom).to.be.closeTo(zoom, ZOOM_THRESHOLD);
  });
});

Cypress.Commands.add("map_get_source_features", (source_id) => {
  cy.window().then((window) => {
    return window.mapbox_handles.map.getStyle().sources[source_id].data
      .features;
  });
});

Cypress.Commands.add("map_get_sources", () => {
  cy.window().then((window) => {
    return Object.keys(window.mapbox_handles.map.getStyle().sources);
  });
});
