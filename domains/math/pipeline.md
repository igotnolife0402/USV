---
summary: Balance-curve and simulation workflow - one script prints the table, tune parameters, then export to the game.
updated: 2026-11-21
status: current
---
# Math pipeline (balance and simulations)

1. Write the model as one script in the project (`tools/<game>/balance.mjs` or `.py`): parameters at the top, a table printed at the bottom.
2. Print the curve at start, middle and end (and the payback time or time-to-level per step).
3. Tune parameters in the script until the table meets the target (e.g. level 50 in about 10 hours).
4. Export: copy the final parameters into the game config (Luau module or JSON); never retype numbers by hand.
5. Commit the script next to the config so the curve can be regenerated.
6. Done: [checklists/math.md](checklists/math.md).
