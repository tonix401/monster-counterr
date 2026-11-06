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
│   │   ├── ManageDataPopup.tsx
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
│   │   ├── MapTab.tsx   # Floating icon overlays over the map (file, view, tool palette, fog actions, zoom, detection popover), drop zone, live player-view pane beside the map
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
│   ├── graph.ts         # The walls as nodes and lines between them (pure functions on an immutable `Graph`): snapping, splitting, moving, joining and dissolving nodes, rectangle/ellipse/polyline builders, the merge step that turns detected lines into shared nodes, and the lists a file keeps
│   ├── mapStore.ts      # Zustand store for the current map, edits and fog (separate from the monster store)
│   ├── mapStorage.ts    # IndexedDB persistence of the current map (too big for localStorage)
│   ├── fogMapFile.ts    # `.fog_map` file format, version 2 (nodes and index pairs; no support for older files)
│   ├── mapSync.ts       # Sends the fogged picture to connected players
│   ├── mapMessage.ts    # Validation of map messages on the client
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
- **Routing**: React Router with nested routes (popups overlay main view). Tabs are routes too: `/` (encounter) and `/map` in the DM app, `/client` and `/client/map` for players
- **Map & fog**: the DM loads a battle map image or `.fog_map` file. Walls are nodes and the lines between them: detection is a one-shot import that joins line ends into shared nodes, and from then on the walls are ordinary nodes and lines. Moving a node moves every line on it, and new lines snap to nodes. Rooms are the faces of that graph (`rooms.ts`, a few ms, no pixel tracing), and rooms can be fogged. Players never receive walls or hidden rooms: when "Share with players" is on, the DM's browser renders a JPEG with fogged rooms painted over and sends it over the existing PeerJS connection (`map` / `map-clear` messages), debounced and resent on every change and when a player joins
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
