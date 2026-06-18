#!/usr/bin/env bash
# Reproduce the probe on any machine — creates a venv, installs deps, runs both probes.
# The chord lane needs no deps; the notation lane needs requirements.txt.
set -euo pipefail
cd "$(dirname "$0")"

python3 jam_to_chordpro.py            # zero-dependency chord lane

python3 -m venv .venv                 # notation lane
. .venv/bin/activate
pip install -q -r requirements.txt
python notation_probe.py

echo "Done — see out/ for results."
