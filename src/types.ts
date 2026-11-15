export type Lang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa';
export const LANGS: Lang[] = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'];

export type Rights = 'public_domain' | 'open_license' | 'creator_submitted' | 'needs_license';
export type ReadMode = 'flip' | 'panel' | 'scroll';
export type Direction = 'ltr' | 'rtl';

export type Localized = Partial<Record<Lang, string>>;

/** A single piece of text in a panel. `audio` lets pre-recorded human audio replace TTS later. */
export interface Line {
  id: string;
  kind: 'narration' | 'speech' | 'thought' | 'sfx';
  speaker?: string; // character id (see Story.characters)
  text: Localized;
  audio?: Partial<Record<Lang, string>>; // URL of a recorded file for this line
}

export interface Actor {
  c: string; // character key, see art/characters
  x: number; // 0..400
  y?: number; // baseline override (default 250)
  s?: number; // scale
  flip?: boolean;
  mood?: 'happy' | 'sad' | 'angry' | 'scared' | 'smug';
}

export interface SceneSpec {
  bg: 'riverbank' | 'island' | 'forest' | 'palace' | 'village-night' | 'market' | 'garden' | 'hunt-park';
  time?: 'day' | 'dusk' | 'night';
  actors: Actor[];
  extras?: string[]; // 'moon' | 'fruit' | 'rain' | 'well' | 'sparkle' ...
  zoom?: number; // camera zoom (1 default)
  focus?: [number, number]; // camera focus point
}

export interface Panel {
  id: string;
  scene: SceneSpec;
  alt: Localized; // screen-reader description of the artwork
  lines: Line[];
}

export interface Character {
  name: Localized;
  pitch: number; // 0.5 – 1.8 speech pitch
  rate?: number;
  voice?: 'f' | 'm' | 'any'; // preferred voice gender hint
}

export interface Credit {
  author: string;
  role: string;
  note?: string;
}

export interface Story {
  id: string;
  langs: Lang[];
  characters: Record<string, Character>;
  pageLayouts: string[]; // one layout key per page
  panels: Panel[];
}

export interface CatalogItem {
  id: string;
  title: Localized;
  blurb: Localized;
  series?: string;
  publisher?: string;
  rights: Rights;
  status: 'available' | 'coming_soon';
  langs: Lang[];
  genres: string[];
  age: 'all' | '5+' | '8+' | '12+';
  readMinutes?: number;
  cover?: SceneSpec;
  palette: [string, string]; // cover accent colours
  credits?: Credit[];
  license?: { name: string; url: string };
  sourceUrl?: string;
  sourceName?: string;
  verifiedOn?: string;
  shelf?: string;
}

export interface Catalog {
  version: number;
  updated: string;
  items: CatalogItem[];
}
