# DNA / The Line Studio direction

Designing DNA's agency website for founders and marketing teams. Goal: explore real work, understand services and start a qualified project brief.

## Reference lock
Primary: https://thelinestudio.com/ — inspected in browser on 2026-09-13. Preserve the immersive full-bleed film opening, overscale supplied identity, compact navigation, large chapter headings, and media-first pacing. Adapt to DNA's work and identity.
Brand authority: the supplied DNA Brand Kit visual guide and SVGs. Exact black #000000, white #FFFFFF, DNA red #8A0F14, silver #C0C0C0. Druk display, Eurostile labels, Inter reading text. The current user instruction to use the supplied SVGs supersedes the prior type-only direction.
Secondary Refero references retrieved: Instrument (53d9fb1b-d8b5-4b2a-b282-66940aeb0ede) for contrasting section scales; Julia Krantz (dfa3ad81-0d1e-447f-b171-2b871cbb27ab) for unframed image/caption pairings and hairline divisions; Freshman (0459f838-4b02-4ab9-b6b1-f3cc6f053034) for minimal navigation on a cinematic black canvas.
Screen research: agency portfolio/gallery/contact search; The Line Studio's live project entries provide the strongest relevant interaction pattern.
Borrow only those structural details. Reference fonts/colors and unrelated interface controls are not imported.

## Decision ledger
- Supplied full SVG creates a transparent cutout in the solid black hero sheet, revealing the film through its silhouette. The main logo image remains at 0% opacity; the mask keeps its responsive size and is centered horizontally and vertically in the viewport. Compact supplied mark in header/menu, full SVG in footer. Preserve native proportions and paths.
- Black hero and work chapter; white studio and services chapter; DNA red manifesto strip; white growth plans; black contact finale. Silver for secondary text on black and structural dividers.
- Real local film and photos from the existing project. Work opens photo stories without invented outcomes, client endorsements, metrics or awards.
- Oversized Druk headlines with restrained Eurostile metadata and Inter body copy.
- GSAP owns animation timelines. Lenis smooths desktop wheel input; touch remains native. Rotating identity and project sheets supply the main choreography, with masked text and the scroll-driven horizontal manifesto supporting it. No WebGL dependency.
- Reduced motion presents final text/media states, removes parallax, and stops background autoplay. Image/poster fallbacks and explicit pause control.
- Preserve existing package prices, catalog, keyboard-operable dialogs and downloadable inquiry brief. The September 16 policy import supplies the verified contact address.
- Verify desktop/mobile/short landscape, content reflow, anchor entry, reduced motion changes, hover/focus, gallery restoration and contact flow.

The existing v2 commit and original v1 repository preserve previous versions. The current user preview is on port 5174; isolated tests default to 5180.

## Verification
- Lint, production build, and all 13 browser tests pass, including reference-inspired motion and navigation behavior.
- Responsive content and image loading checked from 320px through 1920px, plus 667×375 and 844×390 landscape screens.
- Automated accessibility checks pass for the page, project brief, and mobile menu. Keyboard navigation, gallery focus restoration, pricing, brief downloads, film controls, and footer links are covered.
- Direct section entry, font readiness, resizing, and live reduced-motion changes are tested. Visual review covers the hero, both photo stories, manifesto, studio, capabilities, pricing, footer, menu, and brief.

## Motion correction / inspected 2026-09-13
The original motion pass underrepresented the reference. A fresh browser inspection sampled wheel scrolling at 400, 900, 1400, 2000, 2700, and 3500px and mobile menu opening at successive frames.

- The Line holds a full-viewport film behind a foreground identity sheet. That sheet rotates counterclockwise and translates away as scrolling reveals the film.
- Featured projects overlap on a sticky stage. Incoming sheets rise diagonally with clockwise rotation; outgoing sheets rotate counterclockwise, with imagery and title layers moving at different rates. Reverse scrolling retraces the composition.
- Desktop navigation packs slash-separated links together, shifting neighboring labels to make room for an active dot. The mobile menu has a silver outer sheet and delayed red inner sheet, each translating from above with a different rotation.
- DNA will adapt those mechanisms using its own supplied SVGs, brand red, photography, and existing content. GSAP owns scroll-linked transforms; Lenis smooths desktop wheel input. Native touch scrolling remains available. Reduced motion and short landscape screens use the natural document layout.
- Verification must inspect intermediate frames and reverse scrolling, plus menu interruption, focus restoration, final-story reachability, and changing motion preferences while a scene is active.

## Chapter views / September 16, 2026

- Keep the current reference lock, supplied logos, fonts and palette. Revisited Freshman via Refero for flat editorial surfaces, unframed imagery and restrained navigation; no reference fonts, colors or brand assets imported.
- Four separate full-window chapters replace section-scrolling menu links. Each has its own content, a persistent close control, chapter navigation and native overflow. Homepage scroll stays in place. A short mask entrance complements the existing rotating sheets, with a no-animation reduced-motion path.
- About moves from the homepage summary into beliefs and process. Staff & Influencers describes team disciplines and creator partnerships without inventing names. Past Work uses the four requested categories. Services contains project pricing, AI products and the relocated growth packages.
- Homepage service tabs add AI integrations with a call-center preview. Detailed AI copy describes answering, booking and consent-based transactional follow-up without promising guaranteed outcomes or fabricated pricing.
- All dialogs opt out of Lenis event handling. The observer watches both open attributes and mounted/unmounted dialogs, so native scrolling works inside and homepage scrolling resumes after closing. Browser Back/Forward and Escape restore the chapter/home state and opener focus.
- Privacy, Terms and SMS documentation reproduce the user-provided website's published documents, keeping legal text out of marketing rewrites. Standalone policy URLs support direct links independently of JavaScript.
- React review: hooks lint and browser checks cover new behavior. React Doctor reported no errors in nine reviewed files; its warnings concern the pre-existing large App component and positional keys in immutable imported policy trees. Those trees are never reordered or edited interactively, so positional keys do not cause state reassignment.
