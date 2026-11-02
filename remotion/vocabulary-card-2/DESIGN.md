---
version: alpha
name: Duolingo-Feather-Design-System
description: "Duolingo's iconic Feather design language — an ultra-tactile, joyful, gamified aesthetic defined by chunky 3D pushable buttons with distinct bottom borders, vibrant primary colors, pill tags, rounded speech bubbles, cheerful progress bars, and friendly rounded typography. Playful, high-retention education interface that treats UI elements like physical toy blocks."

colors:
  # Brand Primary
  primary-green: "#58CC02"
  primary-green-dark: "#58A700"
  primary-green-light: "#D7FFB8"

  # Contrast Word Accents
  macaw-blue: "#1CB0F6"
  macaw-blue-dark: "#1899D6"
  macaw-blue-light: "#DDF4FF"

  fox-orange: "#FF9600"
  fox-orange-dark: "#E68600"
  fox-orange-light: "#FFEACC"

  # Gamification Accents
  bee-yellow: "#FFC800"
  bee-yellow-dark: "#E5A500"
  bee-yellow-light: "#FFF4CC"

  cardinal-red: "#FF4B4B"
  cardinal-red-dark: "#EA2B2B"
  cardinal-red-light: "#FFDFE0"

  beet-purple: "#CE82FF"
  beet-purple-dark: "#A55EEA"

  # Neutrals & Surfaces
  canvas: "#F7F7F7"
  surface-card: "#FFFFFF"
  surface-soft: "#F4F6F8"
  border-subtle: "#E5E5E5"
  border-thick: "#DCDCDC"
  ink-primary: "#3C3C3C"
  ink-secondary: "#777777"
  ink-muted: "#AFAFAF"

typography:
  display-huge:
    fontFamily: "DIN Round Pro, Feather, Nunito, Plus Jakarta Sans, sans-serif"
    fontSize: 72px
    fontWeight: 900
    letterSpacing: -1px
  heading-xl:
    fontFamily: "DIN Round Pro, Feather, Nunito, Plus Jakarta Sans, sans-serif"
    fontSize: 48px
    fontWeight: 800
    letterSpacing: -0.5px
  heading-lg:
    fontFamily: "DIN Round Pro, Feather, Nunito, Plus Jakarta Sans, sans-serif"
    fontSize: 34px
    fontWeight: 800
  body-bold:
    fontFamily: "DIN Round Pro, Feather, Nunito, Plus Jakarta Sans, sans-serif"
    fontSize: 24px
    fontWeight: 700
  badge-label:
    fontFamily: "DIN Round Pro, Feather, Nunito, Plus Jakarta Sans, sans-serif"
    fontSize: 18px
    fontWeight: 800
    textTransform: uppercase
    letterSpacing: 1.5px

components:
  card:
    background: "#FFFFFF"
    borderRadius: 24px
    border: "2.5px solid #E5E5E5"
    borderBottom: "6px solid #DCDCDC"
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.06)"

  button-3d-green:
    background: "#58CC02"
    color: "#FFFFFF"
    borderRadius: 18px
    border: "none"
    borderBottom: "5px solid #58A700"
    fontWeight: 800

  button-3d-blue:
    background: "#1CB0F6"
    color: "#FFFFFF"
    borderRadius: 18px
    border: "none"
    borderBottom: "5px solid #1899D6"
    fontWeight: 800

  button-3d-white:
    background: "#FFFFFF"
    color: "#3C3C3C"
    borderRadius: 18px
    border: "2px solid #E5E5E5"
    borderBottom: "5px solid #DCDCDC"
    fontWeight: 800

  pill-badge:
    borderRadius: 9999px
    padding: "6px 18px"
    fontWeight: 800
    borderBottom: "3px solid currentColor"
---

# Duolingo Design Guide for Vocabulary Contrast Videos

1. **Light & Energetic Canvas**: Use `#F7F7F7` off-white background with subtle playful floating dots/circles.
2. **Tactile 3D Buttons & Cards**: Every card and clickable button has a chunky 4px to 6px darker bottom border that gives it a physical push-toy feel.
3. **Word Contrast Pairing**:
   - **Word A (SAY)**: Macaw Blue (`#1CB0F6`) with dark blue shadow (`#1899D6`) and light blue tint (`#DDF4FF`).
   - **Word B (TELL)**: Fox Orange (`#FF9600`) with dark orange shadow (`#E68600`) and light orange tint (`#FFEACC`).
4. **Interactive Quiz**:
   - Two large pushable 3D option cards.
   - Distinct green success popup banner (`#D7FFB8` background, `#58CC02` text, `#58A700` button) when answered correctly.
5. **Gamification Chrome**:
   - Top status header features lesson progress bar (Feather Green with round endcap), streak fire 🔥, and gem 💎 counters.

