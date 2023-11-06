// (c) Meta Platforms, Inc. and affiliates. Copyright
/// <reference types="cypress" />

/**
 * Disable network connections
 */
Cypress.Commands.add("goOffline", () => {
  cy.log('**go offline**')
  .then(() => {
    Cypress.automation('remote:debugger:protocol',
      {
        command: 'Network.enable',
      })
  })
  .then(() => {
    Cypress.automation('remote:debugger:protocol',
      {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline: true,
          latency: -1,
          downloadThroughput: -1,
          uploadThroughput: -1,
        },
      })
  })
});

/**
 * Enable network connections
 */
Cypress.Commands.add("goOnline", () => {
  cy.log('**go online**')
  .then(() => {
    // https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-emulateNetworkConditions
    Cypress.automation('remote:debugger:protocol',
      {
        command: 'Network.emulateNetworkConditions',
        params: {
          offline: false,
          latency: -1,
          downloadThroughput: -1,
          uploadThroughput: -1,
        },
      })
  })
})
