/// <reference types="cypress" />

describe("Test Exporting Workspace Session", () => {
    before(() => { });

    beforeEach(() => {
        cy.login();
    });

    it("Verify that geojson and kml links are present and work", function () {
        cy.visit("/pro/network/edit/");
        cy.close_disclaimer();
        cy.close_nux();
        cy.contains('Editing').click();
        cy.contains('Export').click();

        // Assert that session kml file is downloaded
        const kml_url = cy.get('a').contains('KML').invoke('attr', 'href').then(href => {
            cy.request({
                url: href,
                encoding: 'base64'
            })
                .then((response) => {
                    // 3️⃣
                    expect(response.status).to.equal(200);
                });
        });


        // Assert that session geojson file is downloaded
        const geojson_url = cy.get('a').contains('GeoJSON').invoke('attr', 'href').then(href => {
            cy.request({
                url: href,
                encoding: 'base64'
            })
                .then((response) => {
                    // 3️⃣
                    expect(response.status).to.equal(200);
                });
        });
    });
});
