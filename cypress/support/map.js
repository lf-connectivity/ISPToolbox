/// <reference types="cypress" />

const CENTER_THRESHOLD = 1e-6;
const ZOOM_THRESHOLD = 1e-3;
const MAX_RETRIES = 10;

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

// click until popup appears and is in the right place
Cypress.Commands.add("click_and_expect_popup", (point) => {
  let clickTower = (body, count = 0) => {
    cy.click_point_on_map(point);
    cy.wait(500);
    cy.window().then((window) => {
      if (shouldClickAgain(window, body)) {
        if (count > MAX_RETRIES) {
          throw new Error("Failed to click on tower");
        } else {
          clickTower(body, count + 1);
        }
      }
    });
  };

  let shouldClickAgain = (window, body) => {
    // Can't find popup
    if (body.find("div.mapboxgl-popup").length == 0) {
      return true;
    }

    // popup in the right spot?
    else {
      let popupLocation = window.mapbox_handles.map.project(point);
      let translate = `translate(${Math.round(popupLocation.x)}px, ${Math.round(
        popupLocation.y
      )}px)`;

      console.log(
        popupLocation,
        translate,
        body.find("div.mapboxgl-popup")[0].style.transform
      );
      return !body
        .find("div.mapboxgl-popup")[0]
        .style.transform.includes(translate);
    }
  };

  cy.get("body").then((body) => {
    clickTower(body);
  });
});

Cypress.Commands.add("get_mapbox_tooltip", () => {
  cy.get("div.mapboxgl-popup");
});
