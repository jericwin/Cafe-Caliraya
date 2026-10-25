# Caliraya Coffee House — Conceptual Plan Set

| Sheet | Title | Scale (A3) |
|---|---|---|
| A-001 | Site Plan | 1:500 |
| A-101 | Ground Floor Plan | 1:100 |
| A-102 | Second Floor Plan | 1:100 |
| A-103 | Roof Plan | 1:100 |

- `Caliraya-Coffee-House_Plan-Set.pdf`: all four sheets, black and white vector, A3 landscape.
- `dxf/*.dxf`: one AutoCAD DXF (R2018) per sheet. Units are **metres**, at real-world coordinates
  (origin at the building centre, +Y = North). The title block is drawn at plot scale around the plan, so window-plot
  each sheet at the scale shown. Layers follow AIA-style names: `A-WALL`, `A-WALL-PATT`, `A-GLAZ`, `A-DOOR`, `A-STAIR`,
  `A-FURN`, `A-EQPM`, `A-FIXT`, `A-OVHD`, `A-GRID`, `A-ANNO-DIMS`, `A-ANNO-TEXT`, `C-*`, `L-PLNT` and `G-TTLB`.
  Dimensions are true `DIMENSION` entities (style `ARCH`).

**DWG:** open any DXF in AutoCAD, BricsCAD, ZWCAD or DraftSight, then use *Save As → DWG*. To batch-convert, use the free
ODA File Converter.

**Regenerate** after editing `src/config/layout.ts`:
```bash
npx esbuild src/config/layout.ts --bundle --format=esm --platform=node --outfile=tools/.layout.mjs
node -e "import('./tools/.layout.mjs').then(L=>require('fs').writeFileSync('tools/layout.json',JSON.stringify({...L,STAIR:{...L.STAIR,x1:L.STAIR.x1}})))"
python tools/make_drawings.py
```
(Requires Python 3 with `ezdxf` and `matplotlib`.)

Conceptual design, not for construction. All dimensions are preliminary and must be verified by licensed professionals.
