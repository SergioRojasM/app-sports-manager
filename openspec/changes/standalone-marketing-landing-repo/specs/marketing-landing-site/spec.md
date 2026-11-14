# Spec Delta

## Purpose

Public marketing website for GRIT Arena, delivered independently from the product app. It describes the platform's modules, the benefits for athletes and organization owners, and pricing, and routes visitors to the product app for login and public events.

## ADDED Requirements

### Requirement: Single-page marketing content
The landing SHALL render, at its root URL and in this order: header, hero with value propositions, problem/solution, operation modules, administration modules, pricing, and footer. Content and visual design SHALL match the landing previously served at the product app's `/`.

#### Scenario: Visitor opens the landing
- **WHEN** a visitor opens the landing root URL
- **THEN** the header, hero, problem/solution, operation, administration, pricing and footer sections are displayed in that order

#### Scenario: Visual parity across breakpoints
- **WHEN** the landing and the previous app landing are viewed side by side at 375px, 768px and 1440px widths
- **THEN** layout, typography, colors, images and copy are the same

### Requirement: No data or authentication dependencies
The landing SHALL be delivered as static content with no database access, authentication, server-side code or API routes.

#### Scenario: Static delivery
- **WHEN** the landing is produced for deployment
- **THEN** it consists only of static files (HTML, CSS, JS, images) that can be served by any static host

#### Scenario: No backend dependency
- **WHEN** the landing's dependency manifest is inspected
- **THEN** it contains no database, auth, email or reporting client libraries

### Requirement: In-page section navigation
Header navigation items for platform, features, teams, pricing and resources SHALL scroll to the matching section of the same page, on desktop and in the mobile menu.

#### Scenario: Desktop anchor navigation
- **WHEN** a visitor clicks "Precios" in the desktop header
- **THEN** the page scrolls to the pricing section without leaving the page

#### Scenario: Mobile menu navigation
- **WHEN** a visitor opens the mobile menu and selects "Funciones"
- **THEN** the page scrolls to the operation section and the mobile menu closes

### Requirement: Outbound links to the product app
Links to product-app features (login, public events) SHALL be absolute URLs built from a configurable app base URL. No link SHALL point to an app route relative to the landing's own origin.

#### Scenario: Login link
- **WHEN** a visitor clicks "Iniciar sesión" and the app base URL is `https://app.example.com`
- **THEN** the browser navigates to `https://app.example.com/auth/login`

#### Scenario: Events link
- **WHEN** a visitor selects "Plataforma → Eventos"
- **THEN** the browser navigates to `<app base URL>/eventos`

#### Scenario: Trailing slash in configuration
- **WHEN** the app base URL is configured as `https://app.example.com/`
- **THEN** generated links contain a single slash before the path (e.g. `https://app.example.com/auth/login`)

#### Scenario: Missing configuration in local development
- **WHEN** the app base URL is not configured
- **THEN** links default to `http://localhost:3000/...`

### Requirement: SEO metadata
The landing SHALL declare Spanish as its document language and expose a title, meta description, canonical URL, Open Graph tags, a `sitemap.xml` listing the root URL and a `robots.txt` allowing indexing and referencing the sitemap, all based on a configurable site URL.

#### Scenario: Metadata present
- **WHEN** the landing HTML is inspected
- **THEN** `<html lang="es">`, `<title>`, meta description, canonical link and `og:title`, `og:description`, `og:image` are present

#### Scenario: Crawl files
- **WHEN** a crawler requests `/sitemap.xml` and `/robots.txt`
- **THEN** both are served; the sitemap lists the site root URL and robots allows all agents and references the sitemap

### Requirement: Motion and accessibility preservation
Scroll-reveal animations SHALL run on scroll and SHALL be disabled when the visitor prefers reduced motion, with content fully visible. Interactive header controls SHALL keep their accessible names and expanded state.

#### Scenario: Reduced motion
- **WHEN** the visitor's system has `prefers-reduced-motion: reduce`
- **THEN** all sections are visible without reveal or hover animations

#### Scenario: Mobile menu accessibility
- **WHEN** a keyboard user toggles the mobile menu button
- **THEN** the button exposes an accessible label ("Abrir menú" / "Cerrar menú") and an `aria-expanded` state matching the menu

### Requirement: Asset and icon integrity
All images, fonts and icon glyphs used by the landing SHALL load from the landing's own deployment or the approved font provider, with no broken resources.

#### Scenario: No missing resources
- **WHEN** the landing is loaded with the browser network inspector open
- **THEN** no image, font or stylesheet request returns 404 and Material Symbols icons render as glyphs, not ligature text

### Requirement: Contact links
The footer SHALL keep the existing WhatsApp and email contact targets; external links SHALL open in a new tab with `rel="noopener noreferrer"`.

#### Scenario: WhatsApp contact
- **WHEN** a visitor clicks the WhatsApp link in the footer
- **THEN** a new tab opens to the same WhatsApp URL used by the previous landing
