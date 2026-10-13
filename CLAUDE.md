# Merry Gridmas - projectinstructies voor Claude Code

- Lees `SPEC.md` voor alle functionele regels en acceptatiecriteria. `SPEC.md` is leidend bij twijfel.
- Gebruik `REFERENCE_CASE.json` als verplichte regressie-fixture. Verwachte eindmoraal is 87.
- Stack: Vue 3, TypeScript, Vite, Vitest; **geen React**.
- UI-taal: Nederlands; speels maar technisch correct.
- Pure, deterministische domeinfuncties; verberg toekomstige moraalwaarden in de planning.
- Vergrendel uitgevoerde blokken en behoud historische moraalfeedback.
- Houd hardware apart in een adapter; lokaal speelbaar zonder ESP32.
- Geen database, accounts, cloud, echte VTN/VEN of ongevalideerde conformiteitsclaims.
- Houd het eenvoudig en test elke module. Draai typecheck, tests en production build voordat je gereed meldt.
- Als je spelbalans wilt wijzigen, leg eerst het rekenkundige effect uit en vraag toestemming.
