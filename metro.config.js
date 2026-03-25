const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Fix: Zustand v5 ESM build uses import.meta.env which breaks Metro web bundles.
// Force Metro to resolve the CJS build by preferring "default" over "import" condition.
config.resolver.unstable_conditionNames = ["require", "react-native", "default"];

module.exports = withNativeWind(config, { input: "./global.css" });
