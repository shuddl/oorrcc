export const componentPrompts = {
  base: `
Generate a production-ready React component with the following requirements:
- Strict TypeScript typing with proper generics and utility types
- Comprehensive error handling with ErrorBoundary integration
- Performance optimizations using React.memo, useMemo, and useCallback
- Full WCAG 2.1 AA accessibility compliance with ARIA support
- Comprehensive test coverage (unit, integration, and e2e)
- Detailed documentation including JSDoc, Storybook, and usage examples
- SEO optimization with proper meta tags and structured data
- Internationalization support using i18next
- Redux Toolkit/Context API integration for state management
- Advanced event handling with proper typing and debouncing
- Skeleton loading states with transitions
- Comprehensive error states with retry mechanisms
- Empty states with actionable feedback
- Progressive enhancement support
- Mobile-first responsive design
- Custom hook abstractions for complex logic
- Proper cleanup and resource management

**Constraints:**
- Do not use lazy loading techniques in the component.
- Do not include any mock implementations or placeholder code.
- Ensure all code is production-ready with synchronous loading.
- Validate all inputs and handle errors gracefully.
- Maintain high performance and accessibility standards.
`,
    
  accessibility: `
Ensure comprehensive WCAG 2.1 AA compliance:
- Semantic HTML structure with proper landmark roles
- Hierarchical heading structure (h1-h6)
- ARIA labels, roles, and properties for interactive elements
- Keyboard navigation with visible focus indicators
- Focus trap management for modals and dropdowns
- WCAG 2.1 compliant color contrast ratios
- Screen reader announcements for dynamic content
- Touch target sizing (minimum 44x44px)
- Reduced motion support with prefers-reduced-motion
- Alternative text for images and icons
- Form input labels and error messages
- Skip navigation links
- Language declarations
- Proper table markup with headers
- Status announcements for loading states
`,
  
  performance: `
Implement comprehensive performance optimizations:
- Component code splitting with React.lazy and Suspense
- Efficient memo usage with proper dependency arrays
- State batching with useReducer for complex state
- Virtual rendering for large lists
- Image optimization with next-gen formats
- CSS-in-JS optimization with proper bundling
- Network request optimization with caching
- Asset preloading and prefetching strategies
- Service Worker integration for offline support
- Web Vitals monitoring and optimization
- Bundle size optimization with tree shaking
- Resource hints (preconnect, prefetch)
- Browser paint optimization
- Lighthouse score optimization
- Runtime performance profiling
- Memory leak prevention
`,

  patterns: `
Implement robust design patterns and best practices:
- Compound components for flexible composition
- Render props for component logic sharing
- Custom hooks for behavioral reuse
- Context selectors for performance
- Controlled vs Uncontrolled components
- Event delegation patterns
- Proper prop drilling prevention
- State machine patterns for complex UIs
- Builder pattern for complex forms
- Observer pattern for events
- Factory pattern for dynamic creation
- Module pattern for encapsulation
- Singleton pattern for shared resources
- Command pattern for undo/redo
- Strategy pattern for algorithms
`
};