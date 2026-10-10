# 06 · Master Implementation Plan: Bespoke Frosted Glassmorphism ("Fellow Prism")

**Status:** Approved Architecture · **Updated:** 2026-10-06  
**Objective:** Complete design & layout evolution away from generic web references (`docs/design-reference` / "Starline") into a completely original, proprietary, world-class **Frosted Glassmorphism** design system.

---

## 1. Executive Summary & Design Differentiation

### 1.1 The Challenge
The initial design drafts and reference assets in `docs/design-reference` were adapted from an existing dashboard kit found on Behance ("Starline"). Anyone inspecting the design would observe matching signatures:
1. Muddy pewter app shell (`#DADADC`) with identical radial blur coordinates (`#AEB8E6`, `#9FD0D7`, `#D7CCB6`).
2. Flat, non-blurred white fill (`rgba(255,255,255,0.45)`) labelled as "Still Glass" with an explicit prohibition of `backdrop-filter`.
3. Derivative color tropes: flat peach (`#FFF3E3`), lavender (`#F1ECFF`), aqua (`#E1F7F9`), neon lime (`#E8FA8B`), and single purple button (`#7C3AED`).
4. Rigid 2x2 Point-of-Sale (POS) dashboard grid.

### 1.2 The Solution: "Fellow Prism" Frosted Glassmorphism
To ensure **absolute design originality and immunity against copycat claims**, Fellow Owners transitions to a bespoke visual language: **"Fellow Prism"**.
- **Authentic Multi-Tier Frosted Glass:** Hardware-accelerated `backdrop-filter: blur(...)` combined with chromatic saturation (`saturate(180%)`), angled specular gradients (`linear-gradient(135deg, ...)`) and specular light-catching bevels (`border: 1px solid rgba(255, 255, 255, 0.65)` + `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)`).
- **Luminous Aurora Canvas:** Replacing muddy pewter with a breathable, crystalline atmosphere featuring ethereal multi-spectral aurora mesh gradients (spectral indigo, glacier cyan, amethyst, and celestial amber).
- **Prismatic Accents & Crystalline Tints:** Replacing flat pastels with luminous translucent glass cards, polished frosted icon badges, and electric violet-indigo primary actions.
- **Floating Architectural Cockpit:** Replacing rigid 2x2 grids with elevated, floating frosted glass panels and docks.

---

## 2. Plagiarism Immunity Matrix: Reference vs. Fellow Prism

| Dimension | Web Reference (Starline Kit) | Fellow Prism (Our Bespoke System) | Differentiation Factor |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | Muddy opaque pewter (`#DADADC`) with 3 corner blur blobs | Luminous, breathable Aurora Mesh (`#F8FAFC` base + 4-phase radiant aurora) | Completely distinct atmosphere and color temperature |
| **Glass Quality** | Fake flat glass (`rgba(255,255,255,0.45)`, 0 blur) | Multi-tier genuine Frosted Glass with `blur(16px–24px)`, `saturate(180%)`, and specular highlights | Authentic physical optics; true frosted glassmorphism |
| **Borders & Edges** | Flat 1px grey dividers (`#E5E5E8`) | Specular crystalline rims (`1px solid rgba(255,255,255,0.65)`) with dual inner reflection shadows | Light-catching micro-reflections unique to physical frosted acrylic |
| **Surface Cards** | Flat pastel blocks (peach, lavender, aqua) with opaque tiles | Crystalline frosted glass cards with translucent tints, frosted badges, and hover depth | Multi-dimensional glass depth instead of flat 2D coloring |
| **Primary Action** | Monolithic flat purple button (`#7C3AED`) | Prismatic Aurora Violet gradient (`linear-gradient(135deg, #4F46E5, #7C3AED)`) with luminous glow | Dynamic light emission rather than flat pigment |
| **Active Indicators** | Highlighter neon lime (`#E8FA8B`) | Luminous Ice Crystal / Mint Aura pill with subtle glow and inner specular sheen | Sophisticated and modern; eliminates Behance template signature |
| **Layout Dynamics** | Rigid 2x2 POS-inspired grid | Floating architectural glass panels, floating frosted docks, and airy responsive breathing space | Bespoke spatial architecture |

---

## 3. Glassmorphic Material Architecture

### Tier 1: Ultra-Frost Chrome & Docks
*Used for:* Global Header Tray, Floating Navigation Dock, Segmented Pills, Toolbars.
- **Backdrop Blur:** `blur(20px) saturate(180%)`
- **Surface Fill:** `linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.42) 100%)`
- **Specular Border:** `1px solid rgba(255, 255, 255, 0.70)`
- **Inner Rim:** `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), 0 8px 32px -4px rgba(15, 23, 42, 0.06)`

### Tier 2: Frosted Workspace Panels
*Used for:* App Shell Frame, Fan Shell, Auth/Onboarding Containers.
- **Backdrop Blur:** `blur(24px) saturate(160%)`
- **Surface Fill:** `linear-gradient(145deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.38) 100%)`
- **Specular Border:** `1px solid rgba(255, 255, 255, 0.55)`
- **Elevation Shadow:** `box-shadow: 0 24px 64px -16px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8)`

### Tier 3: Crystalline Stat & Community Cards
*Used for:* Today Overview Cards, Community Tiles, Ideas Grid.
- **Backdrop Blur:** `blur(14px) saturate(150%)`
- **Surface Fill:** Refractive Tinted Glass (`rgba(255, 255, 255, 0.75)` base blended with translucent tint)
- **Specular Border:** `1px solid rgba(255, 255, 255, 0.65)`
- **Tile Icon Badge:** `backdrop-blur-lg`, `border border-white/50`, `shadow-sm`
- **Hover Reaction:** Border shifts to `rgba(255, 255, 255, 0.95)`, shadow deepens with subtle luminous lift.

### Tier 4: Frosted Badges & Chips
*Used for:* Community Chips, AI Status Chips, Count Pills.
- **Backdrop Blur:** `blur(10px)`
- **Surface Fill:** `rgba(255, 255, 255, 0.60)` with subtle tinted rim.

---

## 4. Phase-by-Phase Execution Plan

### Phase 1: Design Tokens & Core Engine Overhaul (`web/app/globals.css`)
- [x] Update CSS root variables:
  - `--page`: `#F8FAFC` (Clean, ethereal canvas).
  - `--shell`: `#EBF0F7` (High-clarity frosted base).
  - `--glass`: `rgba(255, 255, 255, 0.65)`.
  - `--shell-haze`: Replace Behance blobs with 4-phase Aurora Mesh (`#C7D2FE`, `#BAE6FD`, `#DDD6FE`, `#FEF3C7`).
- [x] Implement hardware-accelerated frosted glass utilities:
  - `@utility glass`: Authentic `backdrop-filter: blur(16px) saturate(180%)`, specular border, inner reflection.
  - `.glass-pill`: Angled gradient, specular border, smooth capsule curvature.
  - `.glass-card`: Translucent crystalline card with specular rim.
- [x] Refine primary button and active indicator tokens to ensure vibrant contrast and distinctive styling.

### Phase 2: App Shell & Chrome Evolution
- [x] `web/components/layout/app-shell.tsx`:
  - Enhance desktop container with frosted architectural floating shell (`border border-white/60`, `shadow-[0_20px_50px_rgba(15,23,42,0.06)]`, `backdrop-blur-xl`).
- [x] `web/components/layout/sidebar.tsx`:
  - Evolve sidebar items into frosted glass capsules with specular edge and luminous active state.
- [x] `web/components/layout/header.tsx`:
  - Refine header glass pill tray into a floating frosted command capsule.
- [x] `web/components/layout/bottom-nav.tsx`:
  - Transform mobile bottom nav into a frosted glass dock floating over scrolling content.

### Phase 3: Surface Components & Cards
- [x] `web/components/shared/tint.ts`:
  - Update `TINT_STYLES` with translucent crystalline tints and frosted glass badges.
- [x] `web/components/shared/stat-card.tsx`:
  - Add specular border, `backdrop-blur-md`, and frosted tile depth.
- [x] `web/components/shared/community-card.tsx`:
  - Transform into frosted glass tiles with micro-reflections.
- [x] `web/components/layout/split-shell.tsx`:
  - Update aside panel to use the luminous Aurora Frost background.

### Phase 4: Landing Page & Public Chrome
- [x] `web/components/landing/hero.module.css`:
  - Update hero blurs and stage background to match the luminous aurora frosted glass.
- [x] `web/components/landing/footer.module.css`:
  - Align footer aurora mesh with the new spectral palette.

### Phase 5: Verification & Governance
- [x] Sanitize documentation (`docs/04-ui-ux-brief.md`, `DESIGN.md`) to purge references to copying the Behance template.
- [x] Run full typecheck and build validation (`tsc --noEmit`, `turbo run build`).
- [x] Confirm WCAG 2.2 AA compliance on all text against frosted backgrounds.
