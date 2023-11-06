// (c) Meta Platforms, Inc. and affiliates. Copyright
/// <reference types="cypress" />

export const DESKTOP_SIZE = "desktop";
export const TABLET_SIZE = "tablet";
export const MOBILE_SIZE = "mobile";

// We basically only test 3 screensizes anyways, so why not make that more convenient
Cypress.Commands.overwrite(
  "viewport",
  (originalFn, arg1 = undefined, arg2 = undefined, arg3 = undefined) => {
    if (arg1 === DESKTOP_SIZE) {
      originalFn(1920, 1080);
    } else if (arg1 === TABLET_SIZE) {
      originalFn("ipad-mini");
    } else if (arg1 === MOBILE_SIZE) {
      originalFn("iphone-6");
    } else {
      originalFn(arg1, arg2, arg3);
    }
  }
);
