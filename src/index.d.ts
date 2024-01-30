/// <reference types="p-elements-core" />
/// <reference types="@types/animejs" />
/// <reference types="@types/underscore" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare const _: _.UnderscoreStatic;

declare const anime: (params: anime.AnimeParams) => anime.AnimeInstance;

declare const Maquette: { h: H };

declare module "*.css";

declare module "*.html";

declare module "*.svg";

declare module "*.json";

interface Window {
  Maquette?: {
    createProjector: (projectorOptions?: ProjectorOptions) => Projector;
  };
}
