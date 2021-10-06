/// <reference types="cypress" />

import { assertion_within_subject } from "./assertions";

export const NAVBAR = "workspacenavelem";
export const NAVBAR_ACCOUNT_DROPDOWN = "account-dropdown";

Cypress.Commands.add("get_navbar", () => {
  return cy.get(`#${NAVBAR}`);
});

Cypress.Commands.add(
  "navbar_back_button_should",
  { prevSubject: true },
  assertion_within_subject("a[class*='back-icon']", {
    "be.visible.and.work_properly": (item, argument) => {
      item.should("be.visible").should("have.attr", "href", "/pro/");
    },
  })
);

Cypress.Commands.add(
  "navbar_logo_should_be",
  { prevSubject: true },
  (subject, logo_type) => {
    cy.wrap(subject).within(() => {
      if (logo_type === "old_logo") {
        cy.get("svg[cy-id='isptoolbox-logo']").should("be.visible");
        cy.get("svg[cy-id='isptoolbox-new-logo']").should("not.exist");
      } else if (logo_type == "new_logo") {
        cy.get("svg[cy-id='isptoolbox-new-logo']").should("be.visible");
        cy.get("svg[cy-id='isptoolbox-logo']").should("not.exist");
      } else {
        throw Error("Invalid logo type. Choose old_logo or new_logo.");
      }
    });
  }
);

Cypress.Commands.add(
  "navbar_title_should",
  { prevSubject: true },
  assertion_within_subject("span[class*='page-title']", {
    "be.visible.with.text": (item, argument) => {
      item.should("be.visible").should("have.text", argument);
    },
  })
);

Cypress.Commands.add(
  "navbar_beta_flag_should",
  { prevSubject: true },
  assertion_within_subject("span[class*='beta-mark']", {
    "be.visible.with.correct_text": (item, argument) => {
      item.should("be.visible").should("have.text", "[beta]");
    },
  })
);

Cypress.Commands.add(
  "navbar_tool_help_button_should",
  { prevSubject: true },
  assertion_within_subject("button#tool_help_button", {
    "be.visible.with.icon": (item, argument) => {
      item.should("be.visible");
      cy.get("button#tool_help_button > svg:first").should("be.visible");
    },
  })
);

Cypress.Commands.add(
  "navbar_workspace_dropdown_should",
  { prevSubject: true },
  assertion_within_subject(
    "div.file-dropdown-section > div.dropdown > a#navbarDropdown",
    {
      "be.visible.with.correct_items": (item, argument) => {
        const item_order = [
          /^New Session$/,
          /^Make a Copy$/,
          /^Open Session$/,
          /^Manage Towers$/,
          /Import/,
          /^Export$/,
        ];

        let curr_index = 0;

        item.should("be.visible").should("include.text", "Editing").click();

        cy.get(
          "div.file-dropdown-section > div.dropdown > ul[aria-labelledby*='navbarDropdown']"
        ).should("be.visible");

        // make sure items are in the correct order.
        cy.get(
          "div.file-dropdown-section > div.dropdown > ul[aria-labelledby*='navbarDropdown'] > li"
        )
          .each((li) => {
            if (li.text()) {
              cy.wrap(li).should_have_sanitized_text(
                "match",
                item_order[curr_index]
              );
              curr_index++;
            }
          })
          .then(() => {
            expect(curr_index).to.equal(item_order.length);
          });
      },
    }
  )
);

Cypress.Commands.add(
  "navbar_account_dropdown_should",
  { prevSubject: true },
  assertion_within_subject(`div#${NAVBAR_ACCOUNT_DROPDOWN}`, {
    "be.logged_in_view": (item, argument) => {
      // Click on logged in view icon, then check menu items
      item.should("be.visible");
      cy.get(`div#${NAVBAR_ACCOUNT_DROPDOWN} > div.dropdown > a:first`)
        .should("be.visible")
        .click();

      cy.get(
        `div#${NAVBAR_ACCOUNT_DROPDOWN} > div.dropdown > div.dropdown-menu`
      ).should("be.visible");

      cy.get(
        `div#${NAVBAR_ACCOUNT_DROPDOWN} > div.dropdown > div.dropdown-menu > a:eq(0)`
      )
        .should("be.visible")
        .should("have.text", "Manage Account")
        .should("have.attr", "href", "/pro/workspace/account/");

      cy.get(
        `div#${NAVBAR_ACCOUNT_DROPDOWN} > div.dropdown > div.dropdown-menu > a:eq(1)`
      )
        .should("be.visible")
        .should("have.text", "Privacy/Terms")
        .should("have.attr", "href", "#");

      cy.get(
        `div#${NAVBAR_ACCOUNT_DROPDOWN} > div.dropdown > div.dropdown-menu > a:eq(2)`
      )
        .should("be.visible")
        .should("have.text", "Logout")
        .should("have.attr", "href")
        .and("contain", "/pro/accounts/logout/");
    },
    "be.logged_out_view": (item, argument) => {
      // Check that account dropdown says Upload File dialog
      item
        .should("be.visible")
        .should_have_sanitized_text(
          "equal",
          "Upload File or Sign In to save your work."
        )
        .within(() => {
          cy.get("a:contains(Sign In)")
            .should("be.visible")
            .should("have.attr", "href").and('contain',"/pro/accounts/sign-in/");

          cy.get("a:contains(Upload File)").should("be.visible");
        });
    },
  })
);
