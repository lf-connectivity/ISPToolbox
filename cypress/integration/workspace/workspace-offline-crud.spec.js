/// <reference types="cypress" />
context('Work', () => {
    beforeEach(() => {
    	cy.goOnline();
        cy.login();
    })

    afterEach(()=>{
    	cy.goOnline();
    })

    it('Test Disconnection Trying To Create Workspace Features', () => {
    	// Network App
        cy.visit('/pro/network/edit/');
        cy.close_nux();
        cy.wait_mapbox();
        cy.contains('Place Tower').click();
        cy.window().then((win) => {
            expect(win.IspToolboxApp.draw.getMode()).to.equal('draw_ap');
		})
		cy.wait(500);

        cy.goOffline();
        cy.get('#connection_issues_alert').should('be.visible'); 
        cy.get('#map').should('be.visible').click(400, 400);
        cy.goOnline();

        cy.window().then((win) => {
        	expect(win.IspToolboxApp.draw.getAll().features.length).to.equal(0);
		})

		// Market Evaluator
		cy.visit('/pro/market/');
        cy.close_nux();
        cy.wait_mapbox();
        cy.contains('Place Tower').click();
        cy.window().then((win) => {
            expect(win.IspToolboxApp.draw.getMode()).to.equal('draw_ap');
		})
		cy.wait(500);

        cy.goOffline();
        cy.get('#connection_issues_alert').should('be.visible'); 
        cy.get('#map').should('be.visible').click(400, 400);
        cy.goOnline();

        cy.window().then((win) => {
        	expect(win.IspToolboxApp.draw.getAll().features.length).to.equal(0);
		})
    });
})
