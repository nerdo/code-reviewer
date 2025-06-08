# Code Reviewer

A web application for reviewing code changes between git commits with an intuitive file browser and diff viewer.

## Features

- **File Browser**: Navigate through your codebase with clear visual indicators for added, modified, deleted, and renamed files
- **Side-by-Side Diff Viewer**: Compare changes between two commits with synchronized scrolling
- **Inline Diff Viewer**: View changes inline with color-coded additions and deletions
- **Git Integration**: Built on top of simple-git with a clean domain layer abstraction
- **TypeScript**: Fully typed codebase for better development experience
- **Comprehensive Tests**: Unit tests for all core functionality

## Architecture

The application follows clean architecture principles:

- **Domain Layer**: Core entities and business logic (decoupled from git)
- **Infrastructure Layer**: Git integration using simple-git
- **Application Layer**: Express.js API endpoints
- **Presentation Layer**: React frontend with shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Git repository to review

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

This will start both the Express.js server (port 3001) and the React development server (port 3000).

### Usage

1. Open your browser to `http://localhost:3000`
2. The app will load the current repository (or configure the path in `App.tsx`)
3. Select two commits from the dropdown menus to compare
4. Browse files in the left panel - changed files will have visual indicators
5. Click on a file to view its diff
6. Toggle between side-by-side and inline diff views

## Development

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run test` - Run the test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run build` - Build the production bundle

### Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── FileBrowser.tsx  # File tree navigation
│   └── DiffViewer.tsx   # Diff display component
├── domain/              # Core business logic
│   ├── entities/        # Domain entities
│   ├── repositories/    # Repository interfaces
│   └── services/        # Domain services
├── infrastructure/      # External integrations
│   └── git/            # Git repository implementations
├── server/              # Express.js API
│   └── routes/         # API endpoints
└── services/            # Frontend API client
```

## Testing

The project includes comprehensive tests for:

- Domain services (DiffService, FileTreeService)
- React components (FileBrowser, DiffViewer)
- Git repository implementations
- Core entities and business logic

Run tests with:
```bash
npm test
```

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Git Integration**: simple-git
- **Testing**: Jest, React Testing Library
- **Build Tools**: Vite, TypeScript compiler
- **Linting**: ESLint

## License

MIT License