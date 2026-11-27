# Accessibility (WCAG 2.2 AA)

## Key Practices
- **Landmark & Heading Structure:** Uses semantic landmarks (`<header>`, `<main id="main-content">`, `<nav>`, `<aside>`, `<footer>`), skip/jump navigation links, and a clear heading hierarchy.
- **Keyboard & Focus Management:** Interactive controls, links, and toggles are keyboard-focusable with visible focus styling and scroll-margin offsets (`scroll-mt-20`) for anchor targets.
- **Color Contrast & Theme Support:** Supports light and dark themes (`ThemeToggle`) with high-contrast text and status badges.
- **Screen Reader Clarity:** Decorative icons carry `aria-hidden="true"`, live/status banners use appropriate roles (`role="status"`), and components are verified with `axe-core` in automated tests.