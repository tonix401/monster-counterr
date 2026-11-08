# AGENTS.md

## Basic work

When the user askes you to implement something:

- Try your best to understand exactly what the user wants
- Ask for clarification in case of uncertainties
- Create a step by step plan and ask the user to confirm it
- Implement it carefully, keep imports in tact at all times
- Only ever change what the user confirmed before
- Update the AGENTS.md and README.md files in case of bigger structural changes

## Technologies

**Core Stack:**

- **React 19.2.0** - UI framework with latest features
- **TypeScript 5.9.3** - Type-safe development with strict type checking
- **Vite 7.2.4** - Fast build tool and dev server
- **React Router 7.13.0** - Client-side routing with nested routes
- **Zustand 5.0.9** - Lightweight state management with middleware support

**Development Tools:**

- **ESLint 9.39.1** - Code linting with React hooks and Prettier integration
- **Prettier 3.7.4** - Code formatting
- **TypeScript ESLint 8.46.4** - TypeScript-specific linting rules

**Build & Deploy:**

- Static site hosted on **GitHub Pages**
- Base path: `/monster-counterr`
- Development server: `localhost:14120`
- Preview server: `localhost:14120`
- No backend required - fully client-side application

**Key Features:**

- Path aliasing (`@/` resolves to `src/`)
- CSS modules with centralized CSS variables system
- Browser localStorage for data persistence
- External D&D 5e SRD API integration
- Multi-language support with dynamic locale loading
- Type-safe state management (`any` is disallowed by ESLint; existing violations are being cleaned up)

## Project structure

```
src/
├── App.tsx              # Main app component with routing outlet
├── main.tsx             # Entry point, sets up BrowserRouter and routes
├── components/         # Reusable UI components
│   ├── ErrorBoundary.tsx
│   ├── Header.tsx       # App header with menu button
│   ├── popups/          # Modal/popup components (rendered directly by the router)
│   │   ├── Popup.tsx    # Base popup component
│   │   ├── AddMonsterPopup.tsx
│   │   ├── MonsterInfoPopup.tsx
│   │   ├── MenuPopup.tsx           # Main menu popup (Settings, Manage Data, Custom Monsters)
│   │   ├── CustomMonstersPopup.tsx # Custom monsters management popup
│   │   ├── ConnectionsPopup.tsx
│   │   ├── ManageDataPopup.tsx     # Export/import of the save file; maps in the library can be included (off by default)
│   │   ├── MapLibraryPopup.tsx     # The maps kept in this browser: open, rename, duplicate, delete, import (route `maps`)
│   │   └── SettingsPopup.tsx
│   ├── table/           # Monster table components
│   │   ├── MonsterTable.tsx        # Main table component
│   │   ├── MonsterTableRow.tsx     # Individual row
│   │   ├── TableHeaderRow.tsx
│   │   ├── TableColgroup.tsx
│   │   ├── AddMonsterRow.tsx
│   │   ├── DragHandleTableData.tsx
│   │   ├── NameTableData.tsx
│   │   ├── HpTableData.tsx
│   │   ├── ChangeHpTableData.tsx
│   │   ├── StatusTableData.tsx
│   │   ├── ConditionsTableData.tsx
│   │   └── QuickActionsTableData.tsx
│   ├── map/             # Map tab (DM side)
│   │   ├── MapTab.tsx   # Floating icon overlays over the map (file, tool palette, fog actions and wall detection, zoom, detection popover), drop zone, live player-view pane beside the map (share, fog style, monster and player lists); light group (fire, grid) under the tools
│   │   ├── TokenMark.tsx # Vector token (letters, health ring) and the `TokenLayer` laid over a map picture; also used by `MonsterAvatar.tsx` in the encounter table and the map's monster list
│   │   ├── MapIcons.tsx # Inline SVG icons and the IconButton (tooltip + aria-label) used by the map overlays
│   │   └── MapCanvas.tsx # Canvas layers (picture, fog, room highlight) plus a screen-resolution canvas for vector walls, fog painting, node and line select/move, drawing that snaps to nodes and walls, line eraser, zoom and pan
│   └── ui/              # Generic UI components
│       ├── TabBar.tsx   # Route-based tabs (used by the DM app and the client view)
│       ├── BinarySettingsRow.tsx
│       ├── LanguageSelectionRow.tsx
│       ├── DropdownInput.tsx
│       ├── DropdownInputHelper.ts
│       ├── ExportFileButton.tsx
│       ├── ImportFileButton.tsx
│       └── NotificationsContainer.tsx
├── client_app/          # Read-only client view for connected peers
│   ├── ClientView.tsx
│   └── store/
│       ├── ClientStore.ts
│       └── slices/
│           ├── connectionSlice.ts
│           └── termSlice.ts
├── store/               # Zustand state management
│   ├── useMonsterStore.ts       # Consolidated store (all state & actions) and its hooks
│   ├── types.ts                 # Comprehensive MonsterCounterStore types
│   ├── middleware/
│   │   └── temporal.ts          # Undo/redo functionality
│   └── helpers/                 # Feature-based pure utility functions
│       ├── monsters/
│       │   └── monsterHelpers.ts       # Monster operations (create, health, conditions)
│       ├── connections/
│       │   └── connectionHelpers.ts    # P2P networking validation & broadcasting
│       ├── data/
│       │   └── dataHelpers.ts          # Import/export & serialization
│       └── localization/
│           └── localizationHelpers.ts  # Language loading & term resolution
├── map/                 # Map & fog of war (browser-only, no backend)
│   ├── detectWalls.ts   # Straight-wall detection on a grayscale image (bright ridge bands; H/V first, then a rotated pass per dominant slanted angle found from tile-wise gradient histograms)
│   ├── wallFilters.ts   # Cleanup of detected lines: merge thick-wall edge pairs into one centerline,
│   │                    # reject staircase/roof stacks, stringers, dim furniture lines, loose stubs,
│   │                    # slivers beside walls; bridges small jogs in the outline
│   ├── analyze.ts       # `Analyzer` keeps the picture's pixels for wall `detect`
│   ├── rooms.ts         # Rooms straight from the node graph (faces of the planar drawing, painted once into a per-pixel map); runs on the main thread
│   ├── analysis.worker.ts / analyzerClient.ts # Runs wall detection in a Web Worker (inline fallback in tests)
│   ├── graph.ts         # The walls as nodes and lines between them (pure functions on an immutable `Graph`): snapping, splitting, moving, joining and dissolving nodes, rectangle/ellipse/polyline builders, the merge step that turns detected lines into shared nodes, the invisible fixed map border (`ensureBorder`), and the lists a file keeps
│   ├── mapStore.ts      # Zustand store for the current map, edits and fog (separate from the monster store)
│   ├── mapStorage.ts    # IndexedDB library of maps (records in `maps`, file text in `data`, the open map's id in `kv`; too big for localStorage)
│   ├── mapLibrary.ts    # Library record type, ids and unique names
│   ├── fogMapFile.ts    # `.fog_map` file format, version 2 (nodes and index pairs; no support for older files)
│   ├── mapSync.ts       # Sends the fogged picture and, separately, the visible monster tokens to connected players; drops tokens of removed monsters
│   ├── mapMessage.ts    # Validation of map and `map-tokens` messages on the client
│   ├── tokens.ts        # Placed monsters: ring steps and colours, initials, hit test, what players may see (pure functions)
│   ├── tokenArt.ts      # Draws a token on a canvas (the DM's map); `components/TokenMark.tsx` draws the same as SVG
│   ├── fogShade.ts      # Cloudy fog edges (blur and noise on plain arrays) and the darkness colour
│   └── render.ts        # Layer painting and the player picture (grey fog or darkness)
├── types/               # TypeScript type definitions
│   ├── Monster.ts       # Monster entity
│   ├── MonsterDetails.ts # Monster stat blocks
│   ├── Settings.ts      # Settings structure
│   └── Term.ts          # Localization terms
├── hooks/               # Custom React hooks
│   └── useKeyboardShortcut.ts
├── constants/
│   └── index.ts         # App constants (URLs, durations, keys)
├── public/              # Static assets (SVG icons)
│   └── locales/         # Localization files
│       ├── README.md
│       ├── locales.json # List of available languages
│       ├── en.json
│       ├── de.json
│       ├── es.json
│       └── ...
```

**Key Architecture Patterns:**

- **State Management**: Consolidated Zustand store with tight, consistent typing
  - `MonsterCounterStore` interface covers all state (monsters, settings, xp, conditions, terms, notifications, connections)
  - `MonsterCounterActions` interface covers all 40+ actions
  - Persist middleware for localStorage, temporal middleware for undo/redo
  - Fully typed with comprehensive types in `store/types.ts`; `any` is disallowed by ESLint and existing violations are being cleaned up
  - Consistent custom hooks for optimized subscriptions (useMonsters, useSettings, useTerm, etc.), exported from `store/useMonsterStore.ts`
  - Pure utility functions in `store/helpers/*` for testability & composition
- **Routing**: React Router with nested routes (popups overlay main view). Tabs are routes too: `/` (encounter) and `/map` in the DM app, `/client`, `/client/map` and `/client/settings` (bottom tab menu) for players
- **Map & fog**: the DM loads a battle map image or `.fog_map` file. Maps are kept in the browser's IndexedDB library (added when opened, autosaved, chosen from the "My maps" popup); a new image gets walls only when detection is run, unless "find walls automatically" is ticked. Walls are nodes and the lines between them: detection is a one-shot import that joins line ends into shared nodes, and from then on the walls are ordinary nodes and lines. Moving a node moves every line on it, and new lines snap to nodes. An invisible, permanent border runs around the whole map (`border` nodes and lines; fixed, undeletable, never drawn, still snapped to), so the outdoors is a room that connecting a building to the border splits into sections. Rooms are the faces of that graph (`rooms.ts`, a few ms, no pixel tracing), and rooms can be fogged. Encounter monsters and connected players (token id `player:<guid>`, the id each player keeps in its browser and sends with its name, so renames and rejoins keep the spot; last known names are saved in the map file under `players`; blue full ring) can be dragged from the map sidebar onto the map as tokens (the first letters of the name inside a health ring; positions are saved in the map file under `tokens`, version stays 2). Players get the tokens of revealed monsters in unfogged rooms as a separate `map-tokens` message (position, letters, health step; no names) and draw them as SVG over the picture, so tokens stay sharp at any zoom, and the DM's player preview draws the same message. Light (`light.ts`): fires (tokens under `light:<uid>`, never sent to players) and every player token on the map light a circle whose radius is in feet (5 ft = one grid square, `grid.cell` px; default 30 ft sight, 20 ft fire; `ranges` in the map file) cut off by the solid walls (ray sweep to every wall end). None of the heavy light work runs on the main thread (`light.worker.ts`, used through `lightClient.ts`, two workers). The fast one returns each source's polygon as flat numbers (`shapes`): the walls are sent once per change, a source that has not moved costs nothing, and during a drag only the newest request on the `dm` channel waits; `visibilityPolygon` files the walls by direction so a ray only tests the walls in its way. The DM's fog is painted once per change to the rooms or fog (`fogBase`), and every frame only copies it and cuts the polygons out (`paintFogLit`), so a drag costs a canvas fill (`paintFog` writes one 32-bit word per pixel); the picture with its grid (`still`) and the drawn walls (`wallLayer`, a screen-sized canvas redone only when the graph, selection, preview or view change; per-kind segments from `wallsByKind`) are kept as images, and a token drag repaints fog, picture and overlay together once per animation frame (`refogSoon`); it paints at once with the light as it last was and repaints when the worker answers. Fires, players and a selected monster's sight all follow a drag. The slow worker makes each player's picture (lit pixels, cloud fog, grid, JPEG; `renderView`) from a copy of the rooms and picture it is sent only when they change, so a publish never freezes the map. Walls have a kind (`kind` on an edge, absent = solid; `WallKind` in `types.ts`; saved as an optional third number in the file's edge pair). Solid walls bound rooms and stop light. Translucent walls (`kind: 'clear'`, drawn dashed and pale, third value `1`) are windows or bars: they still bound rooms for fog, but `opaqueSegments` leaves them out so light passes. Furniture (`kind: 'furniture'`, drawn green, third value `2`) stops light like a solid wall but `planarize` skips it, so it never makes or splits rooms. Four toggles under the file buttons (`layers` in the map store, DM view only, not saved) hide light sources, players, monsters or walls on the DM's map; hidden kinds are neither drawn nor picked, and the players' picture is untouched. Select mode edits, the tools create: in select mode walls, wall nodes, monsters, players and fires can all be selected (`Selection` is a node, a wall or a token id), moved, and deleted with Delete, Backspace or the bin (a token only leaves the map), and wall node dots and the resize handles of the selected fire or player show only there; tokens are not picked in the other modes. After a drawing tool or the eraser is used the mode returns to select. In select mode a click on empty space starts a line there (the next click ends it; with something selected it only deselects) and a drag on empty space draws one; a double click on a node starts a line from it, and a double click on a wall puts a node there and starts a line; the next click ends the line (the right button makes them translucent; right-drag on empty space and middle-drag pan; a middle click on a wall cycles it solid, translucent, furniture). The cursor says what a press does: grab over a token, move over a wall or node, a resize arrow on a handle, grabbing while dragging or panning. Undo and redo (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, bottom bar) cover walls, token placement, moves and removals, fire sizes and forgotten players, as one `Undo` snapshot per step (a drag is one step); fog and the grid are not in the history, and "remove all edits" is itself an undoable step. With the drawing tools (line, rectangle, circle, polygon) the left mouse button draws the kind chosen in the palette's wall type buttons (solid, translucent, furniture; `drawKind` in the map store) and the right one translucent walls (a polygon takes its kind from its first click); the bottom bar cycles the kind of the selected wall. Each player gets their own picture (`mapSync.ts`, one `View` per player standing on the map, the shared one for everybody else): fires and open rooms are shared, but a player's sight clears the fog only in their own picture and tokens they can't see are not sent to them. The DM's preview shows the shared view. Selecting a player token in select mode makes the DM's own fog show that player's view too: only fires and that player's sight clear it, so areas lit just by other players grey out again. A selected monster token gets a sight circle of its own (30 ft default, `ranges` in the file, resizable by its handles) that clears the DM's fog the same way; it is DM-only, shown only while the monster is selected, and never part of what players see. A selected player or monster also shows two fainter dotted circles at 2/3 and 1/3 of its reach; they are marks only and clear no fog. The lit mask clears the fog in a picture and makes tokens standing in it visible; the DM's own fog is cleared the same way (live while a light is dragged or resized), with the circle's edge and four drag handles to resize it. The grid (`grid` in the file: on, cell size) is drawn into the players' picture under the fog. Players never receive walls or hidden rooms: when "Share with players" is on, the DM's browser renders a JPEG with fogged rooms painted over and sends it over the existing PeerJS connection (`map` / `map-clear` messages), debounced and resent on every change and when a player joins
- **Data Persistence**: All data stored in browser localStorage via Zustand persist
- **Localization**: Dynamic language loading from JSON files
- **External API**: D&D 5e SRD API for official monster data
- **CSS System**: Centralized CSS variables for:
  - Colors (primary, status, overlays)
  - Spacing (xs to 3xl scale)
  - Border radius (sm to 2xl scale)
  - Transitions and shadows
  - All components use these variables for consistency

## Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (localhost:14120)
- `npm run build` - Build for production
- `npm run preview` - Preview production build (localhost:14120)
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run lint` - Lint with ESLint
- `npm run typecheck` - Type check with TypeScript (`tsc -b`)
- `npm run test` - Run tests once with Vitest

## Goals

**Privacy & Data:**

- All user data stored exclusively in browser localStorage
- No server-side storage, tracking, or analytics
- No accounts, login, or authentication required
- Users maintain full control of their data
- Import/export functionality for data portability

**Backward Compatibility:**

- Always maintain compatibility with existing localStorage data
- Never break user's saved encounters with updates
- Handle schema migrations gracefully if needed

**User Experience:**

- Intuitive interface requiring minimal learning curve
- Clean, modern design following D&D aesthetics
- Responsive layout for various screen sizes
- Fast performance!
- Keyboard shortcuts for power users
- Accessible to users with disabilities

**Code Quality:**

- Keep code clean, readable, and maintainable
- Follow DRY principle - avoid duplication
- No unnecessary abstractions or wrapper functions
- Prefer composition over complex inheritance
- Use TypeScript's type system effectively
- Write self-documenting code with clear naming
- Keep components focused and single-purpose
- Minimal dependencies - only include what's truly needed
