// (c) Meta Platforms, Inc. and affiliates
/// <reference types="cypress" />

export const FOOTNOTES_SECTION = "footnotes-section";

Cypress.Commands.add("get_footnote", (selector) => {
  cy.get(`${selector} a:first`)
    .invoke("removeAttr", "target")
    .then((a) => {
      let match = a.text().match(/(\d+)/);
      let num = match[1];

      // Might be a hidden element (see map layer)
      cy.wrap(a).click({ force: true });
      return cy.get(`#${FOOTNOTES_SECTION}-${num}`);
    });
});

Cypress.Commands.add("get_footnote_by_text", (text) => {
  cy.get_footnote(`p:contains(${text})`);
});

Cypress.Commands.add(
  "footnote_text_should_match",
  { prevSubject: true },
  (subject, regex) => {
    cy.wrap(subject).should_have_sanitized_text("match", regex);
  }
);

Cypress.Commands.add(
  "footnote_should_have_link",
  { prevSubject: true },
  (subject, link_text, url) => {
    cy.wrap(subject).within(() => {
      // Get all links with given text within the footer
      cy.get(`a:contains(${link_text})`).each((a) => {
        // Each link should open in a new tab and have a matching url.
        expect(a).to.have.attr("target", "_blank");
        expect(a).to.have.attr("href", url);
      });
    });
  }
);
