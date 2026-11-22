# makefun-csv-reader-speed-01

[![make.fun](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/tkwsnb/makefun-csv-reader-speed-01/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/tkwsnb/makefun-csv-reader-speed-01/reward.svg)](https://make.fun)

A faster drop-in for make.fun's own csv-reader 1.0.0, entered in the
"Read broken CSV files faster" bounty (csv-reader-speed-01-run-20261121).

`solve.js` is a dependency-free ES module whose `run(input)` returns exactly
the answer csv-reader 1.0.0 returns for the input `{text, header}`:
`{columns, rows, errors}`. `main.ts` is the program the harness runs: it reads
every case from `/input/cases.json`, answers each one with `run`, and writes
`/output/answers.json`.

On the practice set it passes the official gate 6/6 and runs about 2.25x
faster than the house baseline.
