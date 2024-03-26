# `<p-component>` element

## About the boilerplate

Boilerplate for creating a custom p-elements using esbuild

This boilerplate includes:

- [esbuild](https://esbuild.github.io/) for transpiling and bundeling typescript to javascript
- [typescript](https://www.typescriptlang.org/) for generating typings
- [postcss](https://postcss.org/) for css pre processing
- [jasmine](https://jasmine.github.io/) Browser test runner
- [playwright](https://playwright.dev/) Test framework
- [husky](https://typicode.github.io/husky/) git hooks made easy, lint staged files before commit
- [eslint](https://eslint.org/) linting
- [prettier](https://prettier.io/) code formatter (eslint plugin)
- [sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs) typescript analyzer (eslint plugin)
- [express](https://expressjs.com/) local development web server

## Getting started with this boilerplate

- Rename the tagName value `p-component` in the `CustomElementConfig` decorator.
- Rename the class name `PComponentElement` to the desired name. Tip: use F2 in visual studio code.
- Rename the component source file `src/p-component.tsx` to the name of your custom element.
- Rename the component test source file `src/p-component.spec.tsx` to the name of your custom element.
- Rename the component stylesheet `src/p-component.css` to the name of your custom element.
- Edit the `name`, `repository` and `types` properties in the `package.json` file to match your component.
- Change the script src and `<p-component name="World"></p-component>` markup in `demo/index.html` so your component script loads correct.
- Edit the (`config.json`) so it match your component source.

## Config

```json
{
  "entryPoints": ["./src/p-component.tsx"],
  "testEntryPoints": ["./src/p-component.spec.tsx"],
  "cssFiles": [
    {
      "src": "./src/styles.css",
      "target": "styles.css"
    }
  ],
  "dist": "./dist",
  "target": "es6",
  "testFiles": [
    "./node_modules/p-elements-core/dist/p-elements-core-modern.js"
  ],
  "browsers": ["chromium", "firefox", "webkit"],
  "chromiumPath": "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
}
```

`entrypoints` source files for the component

`testEntryPoints` source test files for the component

`cssFiles` array of cssFile object `{src: target}` to postcss process

`dist` destination location for build output

`target` build target for example `es6`

`testFiles` files to add to the browser testrunner page

## Attributes

| Name | Description       |
| ---- | ----------------- |
| name | a name e.g. Peter |

## Properties

| Name | Description       | Type   |
| ---- | ----------------- | ------ |
| name | a name e.g. Peter | string |

## Events

| Name | Description |
| ---- | ----------- |
|      |             |

## Install npm packages

```
npm install
```

## Build

```
npm run build
```

## Develop

```
npm run develop
```

## Test

```
npm test
```

## Test development

```
npm run testdevelop
```

## HTML Coverage report

```
npm run test
npm run coverage-report
```

## Before submitting changes

lint

```
npm run lint
```
