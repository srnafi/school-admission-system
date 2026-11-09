import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily:
    '"Segoe UI", system-ui, -apple-system, "Nirmala UI", "Noto Sans Bengali", sans-serif',
  fontFamilyMonospace: '"Cascadia Mono", Consolas, "Noto Sans Bengali", monospace',
  defaultRadius: 'sm',
  headings: { fontWeight: '650' },
  components: {
    Button: { defaultProps: { radius: 'sm', size: 'sm' } },
    TextInput: { defaultProps: { size: 'sm', radius: 'sm' } },
    Table: {
      defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'md', highlightOnHover: true },
    },
  },
});
