import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleIdentityLoader } from "../../../src/services/backups/google-identity.js";

function createOAuth2() {
  return {
    hasGrantedAllScopes() {},
    initTokenClient() {},
    revoke() {}
  };
}

test("Google Identity loader returns an API that is already available", async () => {
  const oauth2 = createOAuth2();
  let scriptLoads = 0;
  const loader = createGoogleIdentityLoader({
    getOAuth2: () => oauth2,
    loadScript: async () => {
      scriptLoads += 1;
    }
  });

  assert.equal(await loader.load(), oauth2);
  assert.equal(scriptLoads, 0);
});

test("Google Identity loader shares one pending script load", async () => {
  const oauth2 = createOAuth2();
  let releaseLoad;
  let scriptLoads = 0;
  let isAvailable = false;
  const loader = createGoogleIdentityLoader({
    getOAuth2: () => isAvailable ? oauth2 : null,
    loadScript: () => {
      scriptLoads += 1;
      return new Promise((resolve) => {
        releaseLoad = () => {
          isAvailable = true;
          resolve();
        };
      });
    }
  });

  const first = loader.load();
  const second = loader.load();

  assert.equal(first, second);
  releaseLoad();
  assert.equal(await first, oauth2);
  assert.equal(scriptLoads, 1);
});

test("Google Identity loader permits a retry after a script failure", async () => {
  const oauth2 = createOAuth2();
  let attempts = 0;
  let isAvailable = false;
  const loader = createGoogleIdentityLoader({
    getOAuth2: () => isAvailable ? oauth2 : null,
    loadScript: async () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error("network failed");
      }

      isAvailable = true;
    }
  });

  await assert.rejects(loader.load(), /network failed/);
  assert.equal(await loader.load(), oauth2);
  assert.equal(attempts, 2);
});

test("Google Identity loader rejects an incomplete authorization API", async () => {
  const loader = createGoogleIdentityLoader({
    getOAuth2: () => null,
    loadScript: async () => {}
  });

  await assert.rejects(loader.load(), /Google Identity Services is unavailable/);
});
