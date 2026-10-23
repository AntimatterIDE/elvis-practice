# Spine coding modifiers (engine + 300-fixture suite)

Deterministic modifiers come from facts + rules — the model never invents
modifier codes. Regenerator: `npx tsx scripts/generate-spine-300.mjs`.

| Modifier | Source |
| --- | --- |
| **95** | `visit.kind` telehealth_* |
| **57** | `visit.decisionForSurgery` |
| **24** | `visit.unrelatedToGlobalSurgery` |
| **25** | Same-day E/M + performed procedure (or `significantSeparateProblem`) |
| **LT / RT / 50** | `procedure.side` when rule has `lateralityModifiers` / `bilateralModifier` (copied to add-on lines) |
| **58 / 78 / 79** | `procedure.globalModifier` |
| **59** | Auto on NCCI indicator-1 pairs |

Fixture fields: `expectedModifiersAnyOf`, `expectedModifiersOnCpt`.

Qualification: **300/300** (`npm run test:qualify` / vitest spine-qualify).
