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
- Edit the (`scripts/build.js`) so the `entryPoints` and `testScripts` match your component source.
- Change the script src and `<p-component name="World"></p-component>` markup in `demo/index.html` so your component script loads correct.

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
