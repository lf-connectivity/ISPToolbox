/// <reference types="cypress" />

export const MARKET_EVAL_PAGE = "/pro/market/";
export const LOS_CHECK_PAGE = "/pro/network/edit/";
export const FOOTNOTES_SECTION = "footnotes-section";
export const MARKET_EVAL_SOURCES_PAGE = "/pro/sources/market_eval/";
export const LOS_CHECK_SOURCES_PAGE = "/pro/sources/edit_network/";
export const NAVBAR = "workspacenavelem";
export const MARKET_EVAL_LOGGED_OUT_PAGE = "/demo/market-app/";
export const LOS_CHECK_LOGGED_OUT_PAGE = "/demo/network-app/";
export const NAVBAR_ACCOUNT_DROPDOWN = "account-dropdown";
export const DASHBOARD_PAGE = "/pro/";
export const LOGIN_PAGE = "/pro/accounts/sign-in/";
export const TERMS_PAGE = "/pro/workspace/terms/";
export const COOKIE_POLICY_PAGE = "/pro/workspace/cookie-policy/";
export const DATA_POLICY_PAGE = "/pro/workspace/data-policy/";
export const MANAGE_ACCOUNT_PAGE = "/pro/workspace/account/";
export const LATEST_LIDAR_PAGE = "/demo/latest-gis-data/";

Cypress.Commands.add("login", () => {
  // reset test accounts
  cy.request("POST", "/test/accounts/").then((response) => {
    expect(response.body).to.have.property("success", true);
  });
  cy.visit(LOGIN_PAGE);

  cy.fixture("login_fixture").then((user) => {
    // {enter} causes the form to submit
    cy.get("input[name=username]").type(user.email);
    cy.get("input[name=password]").type(`${user.password1}{enter}`);
  });

  // we should be redirected to homepage
  cy.url().should("include", "/pro");
});

Cypress.Commands.add("create_session", () => {
  cy.visit("/pro/market/");
});

Cypress.Commands.add("wait_mapbox", () => {
  cy.get(".mapboxgl-ctrl-geocoder--input", { timeout: 6000 }).should("exist");
});

Cypress.Commands.add("close_nux", () => {
  // Close out of new user tour
  cy.get(".shepherd-cancel-icon").should("be.visible");
  cy.get("body").type("{esc}");
});

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

// Test for item existing and not being visible, or not existing at all
function not_exist_or_not_be_visible(selector) {
  if (selector.length > 0 && selector.is("visible")) {
    throw new Error(`${selector} is visible`);
  }
  return selector;
}

/*
 * ======================
 * SOURCES PAGE COMMANDS
 * ======================
 */

Cypress.Commands.add("get_footnote_by_text", (text) => {
  cy.get(`p:contains(${text}) a:first`)
    .invoke("removeAttr", "target")
    .then((a) => {
      let match = a.text().match(/(\d+)/);
      let num = match[1];

      // Might be a hidden element (see map layer)
      cy.wrap(a).click({ force: true });
      return cy.get(`#${FOOTNOTES_SECTION}-${num}`);
    });
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

/*
 * ======================
 * NAV BAR COMMANDS
 * ======================
 */

Cypress.Commands.add("get_navbar", () => {
  return cy.get(`#${NAVBAR}`);
});

// Assertions with funky should clauses, as well as the not_exist_or_invisible clause
// built in as an option
function navbar_assertion(selector, custom_predicates = {}) {
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
  "navbar_back_button_should",
  { prevSubject: true },
  navbar_assertion("a[class*='back-icon']", {
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
  navbar_assertion("span[class*='page-title']", {
    "be.visible.with.text": (item, argument) => {
      item.should("be.visible").should("have.text", argument);
    },
  })
);

Cypress.Commands.add(
  "navbar_beta_flag_should",
  { prevSubject: true },
  navbar_assertion("span[class*='beta-mark']", {
    "be.visible.with.correct_text": (item, argument) => {
      item.should("be.visible").should("have.text", "[beta]");
    },
  })
);

Cypress.Commands.add(
  "navbar_tool_help_button_should",
  { prevSubject: true },
  navbar_assertion("button#tool_help_button", {
    "be.visible.with.icon": (item, argument) => {
      item.should("be.visible");
      cy.get("button#tool_help_button > svg:first").should("be.visible");
    },
  })
);

Cypress.Commands.add(
  "navbar_workspace_dropdown_should",
  { prevSubject: true },
  navbar_assertion(
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
  navbar_assertion(`div#${NAVBAR_ACCOUNT_DROPDOWN}`, {
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
          "Upload File or Log In to pick up where you left off."
        )
        .within(() => {
          cy.get("a:contains(Log In)")
            .should("be.visible")
            .should("have.attr", "href", "/pro/accounts/sign-in/");

          cy.get("a:contains(Upload File)").should("be.visible");
        });
    },
  })
);
