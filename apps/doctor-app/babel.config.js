const path = require('path')

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["module-resolver", {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        root: ["./src"],
        alias: {
          // Maps: api-client/* -> packages/api-client/src/*
          "api-client": path.resolve(__dirname, "../../packages/api-client/src"),
          "intl": path.resolve(__dirname, "../../packages/intl/src"),
          "@ui": path.resolve(__dirname, "../../packages/ui/src"),
          "@utils": path.resolve(__dirname, "../../packages/utils/src")
        }
      }]
    ]
  }
}

