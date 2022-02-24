/// <reference types="cypress" />

context('Test E2E LOS Check', () => {
    beforeEach(() => {
      cy.visit('/demo/los-check/')
    })
  
    it('Check that a link is requested and rendered succesfully', () => {
      // We should start off by loading the lidar view
      cy.get('#loading_spinner', {timeout: 10000}).should('be.visible').should('contain','Loading LiDAR');
      // It should show that the link failed
      cy.get('.link-status', {timeout: 60000}).should('contain', 'Link Status').should('contain', 'Failed');
      // The chart should show the resolution metric
      cy.get('#link_chart').should('contain', 'resolution');
      // Clicking on the legend should display a tooltip that shows the data sources
      cy.contains('Legend').click();
      cy.get('.isptoolbox-tooltip').should('contain', 'Google Elevation API');

      cy.get('#hgt-0').clear().type('60').blur();
      cy.wait(500); // input has debounce on change 
      cy.get('#hgt-1').clear().type('57').blur();
      cy.wait(500); // input has debounce on change 
      cy.get('#lat-lng-0').clear().should('be.empty').type('38.53362, -121.75712').blur();
      cy.wait(500); // input has debounce on change 
      cy.get('#lat-lng-0').should('have.value', '38.53362, -121.75712');
      cy.get('#lat-lng-1').clear().should('be.empty').type('38.53271, -121.75164{enter}').blur();
      cy.wait(500); // input has debounce on change 
      cy.get('#lat-lng-1').should('have.value', '38.53271, -121.75164');
      cy.get('#link_chart', {timeout: 10000}).should('be.visible').should('contain', 'resolution');
      cy.get('.link-status', {timeout: 60000}).should('contain', 'Link Status').should('contain', 'Failed');
      cy.get('#freq-dropdown').click();
      cy.contains('60 GHz').click();
    });
})
