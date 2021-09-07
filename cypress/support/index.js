/// <reference types="cypress" />

export const MARKET_EVAL_PAGE = '/pro/market/'
export const LOS_CHECK_PAGE = '/pro/network/edit/'
export const FOOTNOTES_SECTION = 'footnotes-section'
export const MARKET_EVAL_SOURCES_PAGE = '/pro/sources/market_eval/'
export const LOS_CHECK_SOURCES_PAGE = '/pro/sources/edit_network/'

Cypress.Commands.add("login", () => {
    // reset test accounts
    cy.request("POST", "/test/accounts/").then((response) => {
        expect(response.body).to.have.property("success", true);
    });
    cy.visit("/pro/accounts/sign-in/");

    cy.fixture("login_fixture").then((user) => {
        // {enter} causes the form to submit
        cy.get("input[name=username]").type(user.email);
        cy.get("input[name=password]").type(`${user.password1}{enter}`);
    });

    // we should be redirected to homepage
    cy.url().should("include", "/pro");
});


Cypress.Commands.add("create_session", () => {
    cy.visit('/pro/market/');
});

Cypress.Commands.add("wait_mapbox", () => {
    cy.get('.mapboxgl-ctrl-geocoder--input').should('exist');
})

Cypress.Commands.add("close_nux", () => {
    // Close out of new user tour
    cy.get('.shepherd-cancel-icon').should('be.visible');
    cy.get('body').type('{esc}');
});

Cypress.Commands.add("get_footnote_by_text", (text) => {
    cy.get(`p:contains(${text}) a:first`)
      .invoke('removeAttr', 'target')
      .then((a) => {
        let match = a.text().match(/(\d+)/)
        let num = match[1]

        // Might be a hidden element (see map layer)
        cy.wrap(a).click({force: true})
        return cy.get(`#${FOOTNOTES_SECTION}-${num}`)
    })
})

Cypress.Commands.add("footnote_text_should_match", {prevSubject: true}, (subject, regex) => {
    // Need to do some preprocessing on the footnote text before we match it.
    expect(subject.text().trim().replaceAll(/\s+/ig, ' ')).match(regex)
    return subject
})

Cypress.Commands.add("footnote_should_have_link", {prevSubject: true}, (subject, link_text, url) => {
    cy.wrap(subject)
      .within(() => {
        // Get all links with given text within the footer
        cy.get(`a:contains(${link_text})`)
          .each((a) => {
            // Each link should open in a new tab and have a matching url. 
            expect(a).to.have.attr('target', '_blank')
            expect(a).to.have.attr('href', url)
        })
    })
})