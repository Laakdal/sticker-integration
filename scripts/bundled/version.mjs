// Single source of truth for the bundled-packs version, shared by the generator and each
// pack's generator module so every bundled pack's imageDataVersion tracks BUNDLED_PACKS_VERSION.
/** Bump when bundled pack contents change so existing installs re-copy them. */
export const BUNDLED_PACKS_VERSION = 2;
