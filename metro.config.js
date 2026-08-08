const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// @imgly/background-removal contains an optional dynamic import of
// "onnxruntime-web/webgpu". Expo Web does not need WebGPU here because the
// processor explicitly uses the CPU backend. Redirect the optional import to
// the regular browser build so Metro can bundle the application.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "onnxruntime-web/webgpu") {
    moduleName = "onnxruntime-web";
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// @imgly/background-removal imports ONNX Runtime's browser .mjs build.
// Metro does not include .mjs in Expo projects by default.
config.resolver.sourceExts = [
  ...new Set([...config.resolver.sourceExts, "mjs"]),
];

// Let the package resolve its browser entry point instead of forcing Metro
// through conditional package exports intended for other bundlers.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
