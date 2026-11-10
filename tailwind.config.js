/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sensei: {
          blue: '#1E88E5',
          darkblue: '#0D47A1',
          lightblue: '#E3F2FD',
          yellow: '#FBC02D',
          lightyellow: '#FFFDE7',
          orange: '#FB8C00',
          green: '#43A047',
          lightgreen: '#E8F5E9',
          pink: '#E91E63',
          purple: '#8E24AA',
          surface: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: [
          '"UD Digi Kyokasho NP-R"',
          '"UD Digi Kyokasho NK-R"',
          '"UD Digi Kyokasho N-R"',
          '"BIZ UDPGothic"',
          '"Zen Maru Gothic"',
          '"M PLUS Rounded 1c"',
          'Nunito',
          'system-ui',
          'sans-serif'
        ],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        popJelly: {
          '0%': { transform: 'scale(0.6) rotate(-4deg)', opacity: '0' },
          '65%': { transform: 'scale(1.08) rotate(2deg)', opacity: '1' },
          '82%': { transform: 'scale(0.96) rotate(-1deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' }
        },
        wiggleCelebration: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-6deg) scale(1.05)' },
          '75%': { transform: 'rotate(6deg) scale(1.05)' }
        },
        floatUpFade: {
          '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.7)' },
          '30%': { opacity: '1', transform: 'translate(-50%, -15px) scale(1.1)' },
          '70%': { opacity: '1', transform: 'translate(-50%, -28px) scale(1)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -40px) scale(0.9)' }
        }
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fadeIn': 'fadeIn 0.35s ease-out forwards',
        'pop-jelly': 'popJelly 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'wiggle': 'wiggleCelebration 0.6s ease-in-out infinite',
        'float-up-fade': 'floatUpFade 0.9s ease-out forwards'
      }
    },
  },
  plugins: [],
};
