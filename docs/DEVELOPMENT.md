# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development
npm run dev
```

## Available Scripts

### Development
- `npm run dev` - Start Next.js development server on http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint on all files
- `npm run lint:fix` - Auto-fix linting issues

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Type Checking
- `npm run type-check` - Run TypeScript compiler check
- `npm run type-check:watch` - Watch mode for type checking

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── features/         # Feature components
├── lib/                  # Utilities
│   ├── api/             # API clients
│   ├── utils/           # Helper functions
│   └── constants.ts     # App constants
└── types/               # TypeScript types
```

## Code Style Guide

### TypeScript
```typescript
// Use interfaces for objects
interface User {
  id: string;
  name: string;
}

// Use type for unions/primitives
type Status = 'active' | 'inactive';

// Prefer const assertions
const ROUTES = {
  home: '/',
  representatives: '/representatives',
} as const;
```

### React Components
```typescript
// Functional components with TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={cn('px-4 py-2', {
        'bg-blue-600': variant === 'primary',
        'bg-gray-600': variant === 'secondary',
      })}
    >
      {children}
    </button>
  );
};
```

### API Functions
```typescript
// Always handle errors
export async function getRepresentative(id: string) {
  try {
    const response = await fetch(`/api/representative/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch representative');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching representative:', error);
    throw error;
  }
}
```

## Common Tasks

### Adding a New Page
1. Create file in `app/your-page/page.tsx`
2. Export default component
3. Add to navigation if needed

### Adding an API Route
1. Create file in `app/api/your-route/route.ts`
2. Export named functions (GET, POST, etc.)
3. Handle errors appropriately

### Adding a Component
1. Create in `components/features/YourComponent.tsx`
2. Export named component
3. Add tests in `__tests__`
4. Document props with TypeScript

### Connecting to External API
1. Add credentials to `.env.local`
2. Create client in `lib/api/`
3. Add types in `types/`
4. Handle rate limiting
5. Implement caching

## Troubleshooting

### Common Issues

**Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

**TypeScript errors**
```bash
# Check for type issues
npm run type-check
```

**API rate limiting**
- Check `.env.local` for valid API keys
- Implement caching in API routes
- Add retry logic with exponential backoff

**Build failures**
```bash
# Clean build
rm -rf .next
npm run build
```

## Performance Tips

1. **Use Next.js Image component** for all images
2. **Implement proper caching** for API responses
3. **Use dynamic imports** for large components
4. **Minimize bundle size** - check with `npm run analyze`
5. **Lazy load** non-critical components

## Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] API keys secured
- [ ] Build succeeds locally
- [ ] Lighthouse score > 95
- [ ] Accessibility checked
- [ ] Mobile responsive tested
