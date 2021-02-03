/// <reference types="cypress" />

context('Test E2E LOS Check', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })
  
    it('Check that a link is requested and rendered succesfully', () => {
      // We should start off by loading the lidar view
      cy.get('#loading_spinner').should('be.visible').should('contain','Loading LiDAR');
      // It should show that the link failed
      cy.get('.link-status').should('contain', 'Link Status').should('contain', 'Failed');
      // The chart should show the resolution metric
      cy.get('#link_chart').should('contain', 'resolution');
      // Clicking on the legend should display a tooltip that shows the data sources
      cy.contains('Legend').click();
      cy.get('.isptoolbox-tooltip').should('contain', 'Google Elevation API');
    });

    it('Manually type radio locations and heights', () => {
      cy.get('#hgt-0').clear().type('60');
      cy.get('#hgt-1').clear().type('57');
      cy.get('#lat-0').clear().type('38.53362');
      cy.get('#lng-0').clear().type('-121.75712');
      cy.get('#lat-1').clear().type('38.53271');
      cy.get('#lng-1').clear().type('-121.75164{enter}');
      cy.get('#link_chart', {timeout: 10000}).should('be.visible').should('contain', 'resolution');
      cy.get('.link-status').should('contain', 'Link Status').should('contain', 'Failed');
      cy.get('#freq-dropdown').click();
      cy.contains('60 GHz').click();
    });
})
