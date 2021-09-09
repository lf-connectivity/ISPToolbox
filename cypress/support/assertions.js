/// <reference types="cypress" />

// Test for item existing and not being visible, or not existing at all
export function not_exist_or_not_be_visible(selector) {
  if (selector.length > 0 && selector.is("visible")) {
    throw new Error(`${selector} is visible`);
  }
  return selector;
}

// Assertions with funky should clauses, as well as the not_exist_or_invisible clause
// built in as an option
export function assertion_within_subject(selector, custom_predicates = {}) {
  return (subject, predicate, argument = undefined) => {
    cy.wrap(subject).within(() => {
      let item = cy.get(selector);
      if (predicate === "not.exist.or.not.be.visible") {
        item.should(not_exist_or_not_be_visible);
      } else if (predicate in custom_predicates) {
        custom_predicates[predicate](item, argument);
      } else {
        item.should(predicate, argument);
      }
    });
  };
}

Cypress.Commands.add(
  "should_have_sanitized_text",
  { prevSubject: true },
  (subject, mode, arg) => {
    let sanitized_text = subject.text().trim().replaceAll(/\s+/gi, " ");
    if (mode === "match") {
      expect(sanitized_text).match(arg);
    } else if (mode === "equal") {
      expect(sanitized_text).equal(arg);
    } else {
      throw Error("Invalid mode");
    }
    return subject;
  }
);
