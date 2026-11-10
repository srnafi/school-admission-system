import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 8, dark: 7 },
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Bengali", "Nirmala UI", "SolaimanLipi", "AdorshoLipi", "Kalpurush", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace:
    '"Cascadia Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  defaultRadius: 'md',
  headings: {
    fontWeight: '600',
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Bengali", "Nirmala UI", "SolaimanLipi", sans-serif',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
        size: 'sm',
      },
      styles: {
        root: {
          fontWeight: 600,
          transition: 'all 120ms ease',
        },
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
        radius: 'md',
      },
    },
    Alert: {
      defaultProps: {
        radius: 'md',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
        highlightOnHover: true,
      },
    },
  },
});
