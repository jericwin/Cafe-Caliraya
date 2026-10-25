# Caliraya Coffee House — Interactive 3D Architectural Viewer

A real-time architectural visualization of a **conceptual two-storey lakeside coffee shop in Caliraya, Laguna, Philippines**.
It opens on a cinematic sunset over Caliraya Lake, and you can explore the building, its interiors, the site and parking,
and change the time of day, sun, weather and rendering style.

> **Conceptual design — not for construction.** Every dimension is a preliminary, editable value (metres) defined in
> [`src/config/layout.ts`](src/config/layout.ts). None of them are verified site measurements. A buildable design needs a
> topographic survey, structural calculations and sealed drawings by licensed Philippine professionals.

---

## Quick start

Requirements: **Node.js 18+** (tested with Node 24) and a browser with **WebGL 2** (current Chrome, Edge, Firefox or Safari).

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # type-checks (tsc -b) and bundles into dist/
npm run preview    # serves the production build locally
```

`dist/` is a static site, so you can deploy it to any static host (Netlify, Vercel, GitHub Pages, S3 and so on).

---

## What's in the model

| Area | Contents |
|---|---|
| **Ground floor** (16.0 × 12.0 m) | Café dining hall with a banquette, 2- and 4-seat tables and a lounge corner. Coffee bar and service counter with an espresso machine, grinders, pastry case, POS, back bar and a menu board. **Commercial kitchen** with a 3-compartment sink, dishwasher, range and fryer under an extraction hood, prep island, pass counter with heat lamp, wire shelving, **2-door reach-in refrigerator** and **upright freezer**. Dry storage. **Accessible CR** with WC, grab bars, wall-hung lavatory with visible P-trap, mirror, hand dryer, exhaust fan and floor drain. Staff, utility and electrical room with a distribution panel, water heater, lockers and mop sink. Feature stair. |
| **Second floor** | Upper café lounge with a communal table, sofas, window tables and a reading corner. Function/group room behind a **capiz-shell** screen. Self-service station. Reading nook. **Sunset balcony** facing the lake, with a bar ledge, stools and glass guardrails. |
| **Roof** | Hip roof (17° pitch) with standing-seam metal, deep eaves, timber fascia and soffits, gutters and downpipes. |
| **Site** | Lakeside deck with festoon lights, entrance plaza, a **parking lot** (12 car stalls, 1 PWD stall with access aisle, 6 motorcycle bays, wheel stops, curbs, trench drain and catch basins, light poles), a drop-off/service lane, the access road, walkways, bollards, coconut palms, shade trees, banana plants, flowering shrubs, a lakeside jetty, the lake and the far-shore hills. |

Design cues: modern tropical architecture with deep overhangs, floor-to-ceiling glazing towards the sunset (west), stone, timber battens and fins, and capiz panels.

---

## Using the viewer

### Camera
- **Orbit** (key `1`): drag to rotate, right-drag or Shift-drag to pan, scroll or pinch to zoom, arrow keys to pan.
- **Walk** (key `2`): first-person walkthrough. Click to capture the mouse, use **WASD** or the arrow keys to move and Shift to run; Esc releases the mouse. Walls, glazing, counters and the lake edge all block you, and the stair carries you between floors. On touch screens, use the joystick to move and drag to look.
- **Top** (key `3`): top-down orthographic view.
- **Persp / Ortho** (`O`), **Views** menu (façades, interiors, site, sunset viewpoints and walk start points), and **Reset** (`R`).
- Moving between viewpoints and modes uses animated transitions.

### Building inspection (left panel)
- Floor isolation: **All / GF / 2F / Roof**, plus a *Show roof* toggle.
- **Exploded floors** (`E`), **X-ray walls** (`X`) and **cutaway sections**: N–S, E–W or horizontal, with a slider.
- **Scene hierarchy**: show or hide each layer (floors, furniture, kitchen equipment, CR fixtures, lights, landscaping, parking, vehicles, terrain). Click a layer's name to fly to it.
- **Plans**: GF plan, 2F plan and site plan, with room labels and areas, dimension lines and level tags. Plans switch to midday light for clarity and restore your time setting when you exit.
- **Measure** (`M`, bottom bar): click two points. It snaps to vertices and reports the distance plus Δx/Δy/Δz.
- **Grid** (`G`) and **coordinate axes**.

### Environment (right panel)
- **Time slider** from 6:00 AM to 10:00 PM, with presets: Sunrise, Morning, Noon, Afternoon, Golden Hour, Sunset, Blue Hour and Night. **Animate sun** (`T`) runs the day at a selectable speed. A month selector changes the solar path.
- The sun position uses the NOAA solar model for Caliraya (14.29°N, 121.52°E, UTC+8). Sun direction, shadow length, sky colour, ambient light, fog, water glare and the switch-on of interior and exterior lights all follow the clock.
- Sun intensity, shadows on/off and shadow resolution (1K / 2K / 4K).
- Weather: **Clear / Cloudy / Rainy**. This is a visual simulation, not a forecast.
- **Sunset Mode** (top bar): sets the sunset light, clear sky and cinematic style, and points the camera at the setting sun. Press it again to cycle through the sunset viewpoints: wide view, 2F balcony, deck seating, jetty and over the lake.

### Visual styles
Photorealistic, Cinematic (framing and grade, plus depth of field and bloom on High), Architectural, Clay Model, Blueprint (technical edges) and Wireframe.

### Other
Screenshot (`P`, saves a PNG), fullscreen (`F`), help (`H`), and collapsible side panels. On phones the side panels become a bottom dock with a settings drawer.

---

## Performance

| Tier | Used for | What changes |
|---|---|---|
| **Low** | Phones and touch devices | 1K shadows, non-reflective lake, fewer lights and trees, no post-processing |
| **Medium** | Integrated GPUs (Intel/AMD iGPU, Apple base chips) | 2K shadows, real-time lake reflection at reduced resolution, MSAA |
| **High** | Discrete GPUs | 4K soft shadows, higher-resolution reflections, GTAO ambient occlusion, bloom, depth of field |

The starting tier is picked from the device and GPU. A runtime monitor lowers the render resolution, and steps the tier down if the frame rate stays low. Choosing a quality manually turns this automation off.

Other optimizations: static geometry is merged into one mesh per material (only a few hundred draw calls in total), the shadow map only refreshes when something moves, the lake reflection skips interior detail, and all textures are generated procedurally at start-up, so there are **no external assets to download**.

Reference measurement: an Intel UHD integrated GPU at 1600×900, Medium, runs at about **25–36 fps**.

---

## Project structure

```
src/
  config/
    layout.ts        ← all building / site dimensions, walls, openings, rooms, collision
    viewpoints.ts    ← camera presets and walk start points
  lib/
    sun.ts           ← solar position + atmosphere model (sky, light, fog, exposure)
    skyColor.ts      ← CPU port of the sky shader (fog colour matches the horizon)
    textures.ts      ← procedural PBR textures (wood, stone, tile, concrete, grass…)
    materials.ts     ← material library + Clay / Blueprint / Wireframe / X-ray variants
    primitives.tsx   ← box/cylinder primitives with metric UVs, <Merge> static batching
    geometry.ts      ← hip roof, palms, trees, cars, tapered tubes
    terrain.ts       ← terrain height field, shoreline, walkable ground
  scene/
    building/        ← wall generator (openings, glazing, doors), slabs, stair, roof
    interior/        ← furniture library, GF and 2F interiors, kitchen, CR, outdoor
    site/            ← parking, road, vehicles, landscaping, jetty
    environment/     ← sky, clouds, stars, sun/moon, env map, lake, terrain
    camera/          ← orbit / ortho / plan rig with transitions, walk controller
    tools/           ← measurement tool, plan annotations
    Lighting.tsx     ← interior/exterior fixtures and time-driven lights
    Effects.tsx      ← post-processing (GTAO, DOF, bloom, output)
  store/useStore.ts  ← Zustand state for the whole app
  ui/                ← top bar, side panels, bottom bar, mobile dock/drawer, overlays
```

### Editing the design
- **Footprint, floor levels and stair**: `BLD`, `FFL0`, `FFL1`, `EAVE` and `STAIR` in `layout.ts`.
- **Walls and openings**: each entry in `WALLS` sets the wall's line, thickness, the finish on each face, and its openings (`door`, `window`, `glass` curtain wall, `slider`, `void`). The 3D walls, glazing, door leaves and walkthrough collisions are all generated from these entries.
- **Rooms**: `ROOMS` drives the floor finishes, plan labels and the areas shown.
- **Furniture and equipment**: positions are in `scene/interior/*.tsx` and `scene/site/Site.tsx`.

---

## Technology
React 18, TypeScript, Vite, Three.js r169, React Three Fiber, Drei, Zustand, Tailwind CSS and lucide-react icons.
The sky uses the Preetham physical sky model with an art-directed sunset grade. The lake uses three.js `Water` (planar reflection with an animated normal map). Post-processing uses the three.js `EffectComposer`.

In development builds the store is exposed as `window.__store` for scripted testing.
