# Pronunciation lexicon

One file per story: `content-src/lexicon/<story-id>.json`

```json
{ "en": { "Betaal": "Baitaal", "Vikram": "Vikram" }, "hi": { "बेताल": "बैताल" } }
```

Keys are whole words as written in the story text; values are what is sent to the voice model. Applied before synthesis (so changing an entry regenerates only the lines that contain it). Native speakers: edit these files, not the story text.
