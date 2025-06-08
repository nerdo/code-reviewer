# @nerdo/code-reviewer

A modern, web-based visual git diff tool for reviewing code changes between commits, branches, and tags.

## Features

- 🔍 **Universal Search**: Search commits by hash, message, author, or date
- 📅 **Smart Date Filtering**: Quick presets (Today, Last 7 days, etc.) or custom ranges  
- 🌲 **Branch & Tag Support**: Compare any combination of branches, tags, and commits
- 📁 **File Browser**: Navigate through changed files with syntax highlighting
- 👁️ **Multiple Views**: Side-by-side, inline, or unchanged file views
- 🎯 **Intelligent Highlighting**: Visual indicators for additions, deletions, and changes
- ⚡ **Fast & Responsive**: Built with React and optimized for performance

## Installation & Usage

### Quick Start (Recommended)

Run directly in any git repository:

```bash
npx @nerdo/code-reviewer
```

### Global Installation

```bash
npm install -g @nerdo/code-reviewer
code-reviewer
```

### Options

```bash
npx @nerdo/code-reviewer [options]

Options:
  -p, --port <port>    Port to run on (default: 3001)
  -h, --help          Show help message
  --version           Show version

Examples:
  npx @nerdo/code-reviewer
  npx @nerdo/code-reviewer --port 8080
```

## How to Use

1. **Navigate to a git repository** in your terminal
2. **Run the command**: `npx @nerdo/code-reviewer`
3. **Your browser opens automatically** to the code review interface
4. **Select what to compare**:
   - Choose FROM: branch, tag, or commit
   - Choose TO: branch, tag, or commit  
   - Apply date filters if needed
5. **Review the changes**:
   - Browse files in the left sidebar
   - View diffs in side-by-side or inline mode
   - Use universal search to find specific commits

## Interface Overview

### Selection Controls
- **Branch/Tag Tabs**: Switch between branches and tags
- **Autocomplete Search**: Type to filter and find branches, tags, or commits
- **Date Filters**: Filter commits by time ranges (Today, Last 7 days, custom dates)
- **Universal Search**: Search commits by hash, message, author, or date

### Diff Views
- **Side-by-side**: Traditional two-column diff view
- **Inline**: Unified diff with changes highlighted inline
- **Unchanged**: View complete file content without diff highlighting

### File Browser
- **Tree Structure**: Navigate files and folders
- **Change Indicators**: See which files were added, modified, or deleted
- **Quick Navigation**: Click any file to jump to its diff

## Requirements

- **Node.js**: Version 16 or higher
- **Git**: Must be run from within a git repository
- **Browser**: Modern browser with JavaScript enabled

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