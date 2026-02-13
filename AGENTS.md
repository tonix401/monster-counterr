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
- Type-safe state management with no `any` types

## Project structure

```
src/
├── App.tsx               # Main app component with routing outlet
├── main.tsx             # Entry point, sets up BrowserRouter and routes
├── components/          # Reusable UI components
│   ├── Header.tsx       # App header with menu button
│   ├── popups/          # Modal/popup components
│   │   ├── Popup.tsx    # Base popup component
│   │   ├── AddMonsterPopup.tsx
│   │   ├── MonsterInfoPopup.tsx
│   │   ├── MenuPopup.tsx        # Main menu popup (Settings, Manage Data, Custom Monsters)
│   │   ├── CustomMonstersPopup.tsx # Custom monsters management popup
│   │   └── settingsPopup/
│   │       ├── SettingsPopup.tsx
│   │       ├── BinarySettingsRow.tsx
│   │       └── LanguageSelectionRow.tsx
│   ├── table/           # Monster table components
│   │   ├── MonsterTable.tsx        # Main table component
│   │   ├── MonsterTableRow.tsx     # Individual row
│   │   ├── TableHeaderRow.tsx
│   │   ├── TableColgroup.tsx
│   │   ├── NameTableData.tsx
│   │   ├── HpTableData.tsx
│   │   ├── ChangeHpTableData.tsx
│   │   ├── StatusTableData.tsx
│   │   ├── ConditionsTableData.tsx
│   │   └── QuickActionsTableData.tsx
│   └── ui/              # Generic UI components
│       ├── MonsterSuggestionInput.tsx
│       ├── ExportFileButton.tsx
│       └── ImportFileButton.tsx
├── routes/              # Route components (used as popup overlays)
│   # Popup routes are now handled directly by rendering popup components in the router. No wrapper route files.
├── store/               # Zustand state management
│   ├── useMonsterStore.ts       # Consolidated store (all state & actions)
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
├── types/               # TypeScript type definitions
│   ├── Monster.ts       # Monster entity
│   ├── MonsterDetails.ts # Monster stat blocks
│   ├── Settings.ts      # Settings structure
│   └── Term.ts          # Localization terms
├── hooks/               # Custom React hooks
│   ├── useKeyboardShortcut.ts
│   └── useTerm.ts       # Localization hook
├── constants/
│   └── index.ts         # App constants (URLs, durations, keys)
└── public/
    └── locales/         # Localization files
        ├── locales.json # List of available languages
        ├── en.json
        ├── de.json
        ├── es.json
        └── ...
```

**Key Architecture Patterns:**

- **State Management**: Consolidated Zustand store with tight, consistent typing
  - `MonsterCounterStore` interface covers all state (monsters, settings, xp, conditions, terms, notifications, connections)
  - `MonsterCounterActions` interface covers all 40+ actions
  - Persist middleware for localStorage, temporal middleware for undo/redo
  - No `any` types - fully type-safe with comprehensive types in `store/types.ts`
  - Consistent custom hooks for optimized subscriptions (useMonsters, useSettings, useTerm, etc.)
  - Pure utility functions in `store/helpers/*` for testability & composition
- **Routing**: React Router with nested routes (popups overlay main view)
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
- `npm run preview` - Preview production build (localhost:14121)
- `npm run start` - Start development server (custom script via start.js)
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

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
