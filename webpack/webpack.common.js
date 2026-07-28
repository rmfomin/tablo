const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports.getCommonConfig = (env) => {
  const override_newtab = env.BUILD_TYPE !== "overrideless";
  const manifestFrom = override_newtab
    ? "manifest-normal.json"
    : "manifest-overrideless.json";
  console.log("override_newtab", override_newtab, manifestFrom);
  return {
    entry: {
      // popup: path.join(srcDir, "popup.tsx"),
      newtab: path.join(srcDir, "newtab/index.tsx"),
      // options: path.join(srcDir, "options.tsx"),
      background: path.join(srcDir, "background.ts"),
      // content_script: path.join(srcDir, "content_script.tsx"),
    },
    output: {
      path: path.join(__dirname, "../dist/js"),
      filename: "[name].js",
      clean: true,
    },
    optimization: {
      splitChunks: {
        name: "vendor",
        chunks: "initial",
      },
    },
    module: {
      rules: [
        {
          test: /\.module\.scss$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                esModule: false,
                modules: {
                  localIdentName: "[name]__[local]__[hash:base64:5]",
                },
              },
            },
            "sass-loader",
          ],
        },
        {
          test: /src\/styles\/.*\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            "sass-loader",
          ],
        },
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.svg$/, // Add this rule for SVG files
          use: [
            {
              loader: "@svgr/webpack",
              options: {
                svgoConfig: {
                  plugins: [
                    {
                      name: "preset-default",
                      params: {
                        overrides: {
                          removeViewBox: false,
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {
        "@": srcDir,
      },
      // modules: [
      //     path.join(__dirname, "./node_modules"),
      //     path.join(__dirname, "./"),
      // ],
      extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: ".",
            to: "../",
            context: "public",
            globOptions: {
              ignore: ["**/scss/**"],
            },
          },
          {
            from: `./public/${manifestFrom}`,
            to() {
              // FILENAME_REGEX is a regex that matches the file you are looking for...
              return `../manifest.json`;
            },
          },
        ],
        options: {},
      }),
      new Dotenv(), // Load .env variables
      new webpack.DefinePlugin({
        __OVERRIDE_NEWTAB: JSON.stringify(override_newtab),
      }),
      new MiniCssExtractPlugin({
        filename: "../style.css",
      }),
    ],
  };
};
