/// <reference types="cypress" />

describe("Test Upload KMZ File", () => {
  before(()=>{
  });

  beforeEach(() => {
    cy.login();
  });

  it("Verify error is shown if session name taken", function () {
    cy.visit('/pro/network/edit/');
    cy.visit('/pro/workspace/session/upload/kmz/');
    cy.get('input[name=name]').type('untitled workspace');
    cy.get('input[name=file]').attachFile({ filePath: 'file_inputs/kml_test_fixture.kml'});
    cy.get('input[type=submit]').click();
    cy.get('.error').should('be.visible').should('contain', 'already exists');
  });

  it("Verify error is shown if invalid kml file is used", function() {
    cy.visit('/pro/workspace/session/upload/kmz/');
    cy.get('input[name=name]').type('upload test');
    cy.get('input[name=file]').attachFile({ filePath: 'file_inputs/invalid_kml_test_fixture.kml'});
    cy.get('input[type=submit]').click();
    cy.get('.error').should('be.visible').should('contain', 'sample file');
  });

  it("Verify valid kml can be processed and session is created", function() {
    const session_name = 'upload_test';
    cy.visit('/pro/workspace/session/upload/kmz/');
    cy.get('input[name=name]').type(session_name);
    cy.get('input[name=file]').attachFile({ filePath: 'file_inputs/kml_test_fixture.kml'});
    cy.get('input[type=submit]').click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.contain('network');
      expect(loc.pathname).to.contain(session_name);
    });
  })

});
