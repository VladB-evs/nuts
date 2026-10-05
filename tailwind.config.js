import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

// ---------------------------------------------------------------------------
// Dark mode
//
// The UI is written with Tailwind's stock palette (bg-white, text-gray-900, bg-blue-50 ...).
// Rather than adding a `dark:` variant to every class, the neutral and accent palettes are
// backed by CSS variables: light values are Tailwind's own, and the `.dark` class on <html>
// swaps them. `white` becomes the page surface and `black` becomes the strong foreground, so
// `bg-black text-white` buttons invert cleanly. Use `scrim` for dark overlays that must stay
// dark in both themes.
// ---------------------------------------------------------------------------
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const NEUTRALS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];
const ACCENTS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const DARK_NEUTRAL = {
  50: '21 26 34',
  100: '28 34 44',
  200: '42 49 61',
  300: '58 67 82',
  400: '107 117 133',
  500: '139 149 165',
  600: '163 173 188',
  700: '188 196 208',
  800: '213 218 226',
  900: '232 235 240',
  950: '244 246 249',
};

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const ramp = (name) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));

const themeVariables = () => {
  const light = { '--c-white': '255 255 255', '--c-black': '0 0 0' };
  const dark = { '--c-white': '15 18 24', '--c-black': '244 246 249' };
  for (const name of NEUTRALS) {
    SHADES.forEach((s) => {
      light[`--c-${name}-${s}`] = channels(colors[name][s]);
      dark[`--c-${name}-${s}`] = DARK_NEUTRAL[s];
    });
  }
  for (const name of ACCENTS) {
    SHADES.forEach((s, i) => {
      light[`--c-${name}-${s}`] = channels(colors[name][s]);
      // Accents flip end-to-end: a light tint (50) becomes a deep tint (950) and vice versa.
      dark[`--c-${name}-${s}`] = channels(colors[name][SHADES[SHADES.length - 1 - i]]);
    });
  }
  return { light, dark };
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--c-white) / <alpha-value>)',
        black: 'rgb(var(--c-black) / <alpha-value>)',
        scrim: 'rgb(0 0 0 / <alpha-value>)',
        ...Object.fromEntries([...NEUTRALS, ...ACCENTS].map((n) => [n, ramp(n)])),
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      const { light, dark } = themeVariables();
      addBase({
        ':root': light,
        '.dark': { ...dark, 'color-scheme': 'dark' },
      });
    }),
  ],
}
