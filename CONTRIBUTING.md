# Contributing to CIV.IQ

Thank you for your interest in contributing to CIV.IQ! We're building a transparent civic engagement platform, and every contribution helps make government data more accessible to citizens.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences
- Show empathy towards other community members

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/civic-intel-hub.git`
3. Add upstream remote: `git remote add upstream https://github.com/original/civic-intel-hub.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## 🤝 How to Contribute

### Types of Contributions

#### 🐛 Bug Reports
- Use the issue tracker to report bugs
- Describe the bug in detail
- Include steps to reproduce
- Add screenshots if applicable
- Mention your environment (OS, browser, Node version)

#### ✨ Feature Requests
- Check existing issues first
- Clearly describe the feature
- Explain why it would be useful
- Consider the project scope

#### 💻 Code Contributions
Areas where we especially need help:
- Adding state and local representative data
- Improving search functionality
- Creating data visualizations
- Writing tests
- Improving accessibility
- Documentation

## 🛠️ Development Setup

### Prerequisites
```bash
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

## 📝 Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define proper types, avoid `any`
- Use interfaces for object shapes
- Export types from a central location

### React/Next.js
- Use functional components with hooks
- Keep components small and focused
- Use semantic HTML elements
- Implement proper error boundaries

### Example Component Structure
```typescript
// components/RepresentativeCard.tsx
import { FC } from 'react';
import { Representative } from '@/types';

interface RepresentativeCardProps {
  representative: Representative;
  onSelect?: (id: string) => void;
}

export const RepresentativeCard: FC<RepresentativeCardProps> = ({ 
  representative, 
  onSelect 
}) => {
  // Component logic here
  return (
    <article className="...">
      {/* Component JSX */}
    </article>
  );
};
```

### Styling
- Use Tailwind CSS classes
- Follow the existing design system
- Ensure responsive design
- Maintain consistent spacing

### API Integration
- Use the existing API client functions
- Handle errors gracefully
- Implement proper loading states
- Cache responses when appropriate

## 💬 Commit Guidelines

We follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
feat(search): add address-based representative lookup
fix(api): handle rate limiting in Congress API calls
docs(readme): update installation instructions
test(components): add tests for RepresentativeCard
```

## 🔄 Pull Request Process

1. **Update your fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes**
   - Write clean, documented code
   - Add tests for new features
   - Update documentation

4. **Test your changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. **Submit PR**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made
   - Include screenshots for UI changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Screenshots (if applicable)

## Related Issues
Fixes #(issue number)
```

## 🐛 Reporting Issues

### Before Submitting
- Check existing issues
- Try the latest version
- Verify it's reproducible

### Issue Template
```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Node Version: [e.g., 18.17.0]

## Additional Context
Any other relevant information
```

## 🎯 Priority Areas

Current priorities for contributions:

1. **Data Coverage**
   - State legislature integration
   - Local government officials
   - Historical voting data

2. **Features**
   - Advanced search filters
   - Bill tracking
   - Email notifications
   - Data exports

3. **Technical Improvements**
   - Performance optimization
   - Test coverage
   - Accessibility improvements
   - Mobile responsiveness

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Congress.gov API Docs](https://api.congress.gov/)
- [FEC API Docs](https://api.open.fec.gov/developers/)

## ❓ Questions?

- Open a [Discussion](https://github.com/yourusername/civic-intel-hub/discussions)
- Join our [Discord/Slack] community
- Email: contribute@civiq.org

Thank you for helping make government data more accessible! 🙏
