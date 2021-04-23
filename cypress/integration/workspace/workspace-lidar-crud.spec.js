/// <reference types="cypress" />

describe('Test Workspace Features for LiDAR Tool', () => {
    beforeEach(() => {
        // reset test accounts
        cy.request('POST', '/test/accounts/').then(
          (response) => {
            expect(response.body).to.have.property('success', true);
          }
        );
        cy.visit('/pro');
        cy.getCookie('csrftoken').should('exist').then((cookie) => {
            cy.fixture('login_fixture').then((user) => {
                cy.request({
                    method: 'POST',
                    url: '/pro/accounts/sign-in/',
                    failOnStatusCode: false, // dont fail so we can make assertions
                    form: true, // we are submitting a regular form body
                    body: {
                        username: user.email,
                        password: user.password1,
                        csrfmiddlewaretoken: cookie.value,
                    }
                })
            });
        });
        cy.fixture('login_fixture').as('user');
    });
  
    it('Check Login Works', function () {
      cy.visit('/pro');
      cy.get('h6').should('contain', this.user.first_name);
    });

    it('Check Simple Network CRUD Operations', function () {
        cy.visit('/pro/network/edit/');
    });
  })