export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-foreground': 'var(--color-on-primary)',
        background: 'var(--color-surface)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-surface-2)',
        'muted-foreground': 'var(--color-text-muted)',
        input: 'var(--color-border)',
        ring: 'var(--color-primary)',
      },
    },
  },
  plugins: [],
};
