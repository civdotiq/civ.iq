# Contributing to CIV.IQ

Thank you for your interest in contributing to CIV.IQ! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Areas for Contribution](#areas-for-contribution)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, identity, or experience level.

### Expected Behavior

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy toward other community members

### Unacceptable Behavior

- Harassment, discriminatory language, or personal attacks
- Publishing others' private information
- Trolling or inflammatory comments
- Other unprofessional conduct

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Git
- A GitHub account
- Basic knowledge of TypeScript and React

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/civic-intel-hub.git
   cd civic-intel-hub
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/civic-intel-hub.git
   ```

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Obtain API keys (see [README.md](README.md#required-api-keys))

4. Start development server:
   ```bash
   npm run dev
   ```

5. Run tests to verify setup:
   ```bash
   npm test
   ```

## Development Process

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Open an issue** for major changes to discuss your approach
3. **Keep changes focused** - one feature/fix per pull request

### Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use prefixes: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`

2. **Make your changes** following coding standards

3. **Test your changes** thoroughly:
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add district boundary visualization"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/)

5. **Keep your branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- **Strict mode enabled** - no `any` types without justification
- **Use interfaces** for object shapes
- **Null safety** - handle undefined/null explicitly
- **Readonly arrays** where appropriate
- **Descriptive variable names** - avoid single letters except in loops

Example:
```typescript
// Good
interface RepresentativeProfile {
  readonly bioguideId: string;
  readonly name: string;
  readonly party?: string;
}

// Avoid
let x: any = getData();
```

### React Components

- **Functional components** with hooks
- **TypeScript props** with interfaces
- **Meaningful component names** - descriptive and specific
- **Keep components focused** - single responsibility
- **Use React.memo** for expensive renders

Example:
```typescript
interface RepresentativeCardProps {
  representative: Representative;
  onSelect?: (id: string) => void;
}

export const RepresentativeCard: React.FC<RepresentativeCardProps> = React.memo(
  ({ representative, onSelect }) => {
    // Component implementation
  }
);
```

### Code Organization

```
src/
├── app/              # Next.js routes
├── components/       # Reusable UI components
├── lib/             # Utilities and services
├── hooks/           # Custom React hooks
└── types/           # TypeScript definitions
```

- **Colocate related code** - keep files near where they're used
- **Avoid deep nesting** - max 3-4 levels
- **Single export per file** for components
- **Named exports** for utilities

### Styling

- **Tailwind CSS** for styling
- **Consistent spacing** - use Tailwind's scale (4px increments)
- **Responsive design** - mobile-first approach
- **Accessibility** - proper ARIA labels, semantic HTML

### API Routes

- **Input validation** on all endpoints
- **Error handling** with proper HTTP status codes
- **Rate limiting** where appropriate
- **Type-safe responses** using TypeScript interfaces

Example:
```typescript
export async function GET(request: Request) {
  try {
    // Validate input
    const { searchParams } = new URL(request.url);
    const zip = searchParams.get('zip');
    
    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format' },
        { status: 400 }
      );
    }

    // Process request
    const data = await fetchData(zip);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing Requirements

### Test Coverage

- **New features** must include tests
- **Bug fixes** should include regression tests
- **Aim for 80%+ coverage** for critical paths

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage

# Type checking
npm run type-check
```

### Writing Tests

Use descriptive test names:

```typescript
describe('RepresentativeCard', () => {
  it('should display representative name and party', () => {
    // Test implementation
  });

  it('should call onSelect when clicked', () => {
    // Test implementation
  });

  it('should handle missing photo gracefully', () => {
    // Test implementation
  });
});
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code follows style guidelines
- [ ] Commits follow conventional commits format
- [ ] Documentation updated if needed

### PR Template

Your PR description should include:

1. **What** - What changes are being made?
2. **Why** - Why are these changes necessary?
3. **How** - How do the changes work?
4. **Testing** - How were the changes tested?
5. **Screenshots** - For UI changes, include before/after screenshots
6. **Related Issues** - Link to relevant issues

Example:
```markdown
## Description
Adds interactive district boundary visualization using Leaflet.js

## Why
Users need to see visual representations of congressional districts to better understand geographic boundaries.

## Changes
- Added Leaflet.js integration
- Created DistrictMap component
- Added district boundary API endpoint
- Updated district pages with map display

## Testing
- Tested with multiple districts (CA-12, NY-14, TX-10)
- Verified map loads correctly with boundaries
- Tested error handling when boundary data unavailable

## Screenshots
[Before/After images]

Fixes #123
```

### Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **Code review** by at least one maintainer
3. **Address feedback** - respond to review comments
4. **Squash commits** if requested
5. **Merge** - maintainer will merge when approved

## Areas for Contribution

### High Priority

- **State Legislature Integration** - OpenStates API implementation
- **Local Government Data** - City/county official tracking
- **Accessibility** - WCAG 2.1 AA compliance improvements
- **Test Coverage** - Expand unit and integration tests
- **Performance** - Bundle size optimization, caching improvements

### Medium Priority

- **Documentation** - API docs, user guides, architecture docs
- **UI/UX** - Design improvements, mobile optimization
- **Data Validation** - Additional API cross-validation
- **Error Handling** - Improved error messages and recovery

### Good First Issues

Look for issues labeled `good-first-issue` or `help-wanted` in the GitHub issue tracker.

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/OWNER/civic-intel-hub/discussions)
- **Bug reports**: Open an [Issue](https://github.com/OWNER/civic-intel-hub/issues)
- **Email**: mark@marksandford.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License with attribution requirements. See [LICENSE](LICENSE) for details.

---

**Thank you for contributing to CIV.IQ and helping make government data more accessible!**
