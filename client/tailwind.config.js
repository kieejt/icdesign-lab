/** @type {import('tailwindcss').Config} */

/*
 * Design tokens for the IC Design Lab site.
 *
 * The reference point is the academic research-lab convention — MIT CSAIL,
 * Stanford SAIL, Berkeley BAIR, ETH/EPFL group pages — rather than a marketing
 * site. That convention is specific and worth naming, because it drives every
 * value below:
 *
 *   - A near-white ground and a neutral grey text ramp. No warm tints, no
 *     gradients on content surfaces.
 *   - Exactly one institutional accent, used for links and state, never for
 *     decoration. Here it is HUST crimson.
 *   - A serif for headings and a neutral sans for body — the pairing used by
 *     journals and university departments. It signals scholarship in a way a
 *     geometric display face does not.
 *   - Restrained heading sizes. Academic pages are read, not scrolled past, so
 *     an h1 sits near 2.5–3rem instead of filling the viewport.
 *   - Square corners and hairline rules, which keep dense tabular content
 *     (publications, people, seminar listings) legible.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Page grounds. Near-white, faintly cool — an institutional page, not
        // a cream editorial one.
        paper: {
          DEFAULT: '#FDFDFC',
          raised: '#FFFFFF',
          sunken: '#F4F5F6',
          border: '#E2E4E7',
        },

        // Neutral text ramp.
        ink: {
          50: '#F7F8F8',
          100: '#EDEEEF',
          200: '#D9DBDE',
          300: '#B3B7BC',
          400: '#82878E',
          500: '#5F656C',
          600: '#474D54',
          700: '#343A40',
          800: '#22262B',
          900: '#14171A',
          950: '#0B0D0F',
        },

        // Institutional accent — HUST crimson. Links, active nav, focus rings.
        accent: {
          50: '#FCF2F3',
          100: '#F8DFE2',
          200: '#EFBAC0',
          300: '#E08E98',
          400: '#CC5C6A',
          500: '#B23344',
          600: '#9E1B32',
          700: '#801628',
          800: '#5D1220',
          900: '#3E0C16',
        },

        // Status only — never decoration.
        signal: {
          ok: '#1F6B45',
          okSoft: '#EBF4EF',
          warn: '#8A6100',
          warnSoft: '#FAF2DF',
          danger: '#9E1B32',
          dangerSoft: '#FBEDEF',
          info: '#1B4F8A',
          infoSoft: '#EDF3FA',
        },
      },

      fontFamily: {
        // Headings: a text serif designed for long-form academic reading.
        display: ['"Source Serif 4 Variable"', '"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        // Body and UI.
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Metadata, labels, identifiers, tabular figures.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Deliberately modest. An academic h1 introduces a page; it is not a
        // billboard, and oversized display type pushes the actual content below
        // the fold on every single page.
        'display-sm': ['clamp(1.5rem, 2.4vw, 1.875rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.875rem, 3.2vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        'display-lg': ['clamp(2.25rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },

      letterSpacing: {
        label: '0.12em',
      },

      maxWidth: {
        shell: '82rem', // outer content rail
        prose: '70ch',
        measure: '46rem', // single-column reading measure
      },

      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
        full: '9999px',
      },

      boxShadow: {
        raise: '0 1px 2px rgba(11,13,15,0.05)',
        lift: '0 1px 3px rgba(11,13,15,0.06), 0 12px 28px -18px rgba(11,13,15,0.25)',
        overlay: '0 16px 48px -16px rgba(11,13,15,0.3)',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 140ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
