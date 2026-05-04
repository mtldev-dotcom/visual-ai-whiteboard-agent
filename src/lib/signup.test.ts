import { afterEach, describe, expect, it } from "vitest";

import { isSignupEnabled } from "./signup";

const originalAppSignup = process.env.APP_SIGNUP;

afterEach(() => {
  process.env.APP_SIGNUP = originalAppSignup;
});

describe("isSignupEnabled", () => {
  it("enables signup by default", () => {
    delete process.env.APP_SIGNUP;

    expect(isSignupEnabled()).toBe(true);
  });

  it("disables signup when APP_SIGNUP is disable", () => {
    process.env.APP_SIGNUP = "disable";

    expect(isSignupEnabled()).toBe(false);
  });

  it("accepts enabled values without special handling", () => {
    process.env.APP_SIGNUP = "enable";

    expect(isSignupEnabled()).toBe(true);
  });
});
