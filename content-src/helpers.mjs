// Authoring helpers. n = narration, s = speech, t = thought, x = sfx.
export const n = (text) => ({ kind: 'narration', text });
export const s = (speaker, text) => ({ kind: 'speech', speaker, text });
export const t = (speaker, text) => ({ kind: 'thought', speaker, text });
export const x = (text) => ({ kind: 'sfx', text });
export const P = (scene, alt, lines) => ({ scene, alt, lines });
