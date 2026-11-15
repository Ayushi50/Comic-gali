#!/usr/bin/env python3
"""Local synthesis with AI4Bharat Indic Parler-TTS (Apache-2.0). Run by scripts/generate-audio.mjs; not used in production.

Usage: parler_synth.py jobs.json out_dir
jobs.json: [{"key": "...", "text": "...", "description": "..."}]  ->  out_dir/<key>.wav (16-bit mono)

Setup (once): pip install torch transformers soundfile git+https://github.com/huggingface/parler-tts.git
The model is gated on Hugging Face: accept its conditions on the model page, then `huggingface-cli login`.
"""
import json, os, sys
import numpy as np, soundfile as sf, torch
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

MODEL = os.environ.get("PARLER_MODEL", "ai4bharat/indic-parler-tts")
jobs = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL).to(device)
tok = AutoTokenizer.from_pretrained(MODEL)
desc_tok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
for j in jobs:
    path = os.path.join(out, j["key"] + ".wav")
    if os.path.exists(path):
        continue
    d = desc_tok(j["description"], return_tensors="pt").to(device)
    p = tok(j["text"], return_tensors="pt").to(device)
    with torch.no_grad():
        gen = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask, prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
    audio = gen.cpu().numpy().squeeze().astype(np.float32)
    sf.write(path, audio, model.config.sampling_rate, subtype="PCM_16")
    print("ok", j["key"], flush=True)
