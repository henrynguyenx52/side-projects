# Local project layout

This directory is the isolated local workspace for the SoulX-FlashHead Lite experiment.

```text
soulx-flashhead-local/
  repo/          # cloned community fork and source changes
  models/        # optional shared model location
  outputs/       # generated videos, never committed
  logs/          # benchmark and runtime logs
  results/       # benchmark metadata and report
  benchmark.py   # reproducible timing harness
  cleanup.sh     # cleanup commands
```

The source clone is kept separate from downloaded weights and generated files so cleanup does not require touching unrelated projects. Run `./cleanup.sh artifacts` to remove the virtual environment, weights, outputs, and logs while retaining source. Run `./cleanup.sh all` only when the clone itself should be removed.

The fork's original setup script remains available for inspection, but it should not be run until Python 3.11+ is selected and network access is available. Model downloads remain under explicit user control.
