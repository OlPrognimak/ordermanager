const path = require("path");

/**
 * When package.json has "proxy", CRA sets allowedHosts to [urls.lanUrlForConfig].
 * If no private LAN IP is detected, that becomes [undefined], which webpack-dev-server v5
 * rejects ("allowedHosts[0] should be a non-empty string"). Normalize to a valid value.
 */
function fixAllowedHosts(devServerConfig) {
  const ah = devServerConfig.allowedHosts;
  if (Array.isArray(ah)) {
    const clean = ah.filter((h) => typeof h === "string" && h.length > 0);
    devServerConfig.allowedHosts = clean.length > 0 ? clean : "all";
  } else if (ah == null || ah === "") {
    devServerConfig.allowedHosts = "all";
  }
  return devServerConfig;
}

module.exports = {
  devServer: (devServerConfig) => fixAllowedHosts(devServerConfig),
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
  },
};
