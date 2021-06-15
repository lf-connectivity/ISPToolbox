/// <reference types="cypress" />

context('Test Market Evaluator Functionality', () => {
    beforeEach(() => {
      cy.visit('/pro/market/')
    })

    const fields_to_check = [
        "building_overlays",
        "polygon_area",
        "median_income",
        "median_speeds",
        "service_providers",
        "broadband_now"
    ];
  
    it('Verify that websocket connection is established and that request is processed', () => {
      // Check That All fields are not empty
      fields_to_check.forEach( v => {
          cy.get(`#${v}`).should('not.be.empty');
      });      
    });
})
