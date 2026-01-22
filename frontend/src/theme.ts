import { createTheme, MantineColorsTuple, rem } from '@mantine/core';

const electricBlue: MantineColorsTuple = [
  '#E6F0FF',
  '#CCE1FF',
  '#99C3FF',
  '#66A5FF',
  '#4D7CFF',
  '#0052FF',
  '#0047E6',
  '#003DCC',
  '#0033B3',
  '#002999',
];

const slateGray: MantineColorsTuple = [
  '#F8FAFC',
  '#F1F5F9',
  '#E2E8F0',
  '#CBD5E1',
  '#94A3B8',
  '#64748B',
  '#475569',
  '#334155',
  '#1E293B',
  '#0F172A',
];

const successGreen: MantineColorsTuple = [
  '#F0FDF4',
  '#DCFCE7',
  '#BBF7D0',
  '#86EFAC',
  '#4ADE80',
  '#22C55E',
  '#16A34A',
  '#15803D',
  '#166534',
  '#14532D',
];

const dangerRed: MantineColorsTuple = [
  '#FEF2F2',
  '#FEE2E2',
  '#FECACA',
  '#FCA5A5',
  '#F87171',
  '#EF4444',
  '#DC2626',
  '#B91C1C',
  '#991B1B',
  '#7F1D1D',
];

const warningYellow: MantineColorsTuple = [
  '#FEFCE8',
  '#FEF9C3',
  '#FEF08A',
  '#FDE047',
  '#FACC15',
  '#EAB308',
  '#CA8A04',
  '#A16207',
  '#854D0E',
  '#713F12',
];

export const theme = createTheme({
  colors: {
    blue: electricBlue,
    gray: slateGray,
    green: successGreen,
    red: dangerRed,
    yellow: warningYellow,
  },
  primaryColor: 'blue',
  fontFamily: '"Inter", system-ui, sans-serif',
  fontFamilyMonospace: '"Inter", system-ui, sans-serif',
  headings: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.2' },
      h2: { fontSize: rem(24), lineHeight: '1.3' },
      h3: { fontSize: rem(20), lineHeight: '1.4' },
      h4: { fontSize: rem(18), lineHeight: '1.4' },
      h5: { fontSize: rem(16), lineHeight: '1.5' },
      h6: { fontSize: rem(14), lineHeight: '1.5' },
    },
  },
  fontSizes: { xs: rem(12), sm: rem(14), md: rem(16), lg: rem(18), xl: rem(20) },
  spacing: { xs: rem(8), sm: rem(12), md: rem(16), lg: rem(24), xl: rem(32) },
  radius: { xs: rem(4), sm: rem(8), md: rem(12), lg: rem(16), xl: rem(20) },
  defaultRadius: 'lg',
  shadows: {
    xs: '0 1px 3px rgba(0,0,0,0.06)',
    sm: '0 1px 3px rgba(0,0,0,0.06)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.08)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
  },
  white: '#FFFFFF',
  black: '#0F172A',
  components: {
    Button: {
      defaultProps: { radius: 'xl' },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': { transform: 'translateY(-2px)' },
          '&:active': { transform: 'scale(0.98)' },
        },
      },
    },
    Card: {
      defaultProps: { radius: 'xl', padding: 'xl', withBorder: true },
      styles: {
        root: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 10px 15px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    Paper: {
      defaultProps: { radius: 'xl', padding: 'lg' },
      styles: { root: { background: '#FFFFFF', border: '1px solid #E2E8F0' } },
    },
    TextInput: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
          '&::placeholder': { color: '#64748B' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    PasswordInput: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    Select: {
      defaultProps: { radius: 'lg', checkIconPosition: 'right' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    DatePickerInput: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
          '&::placeholder': { color: '#64748B' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    TimeInput: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
          '&::placeholder': { color: '#64748B' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    SegmentedControl: {
      styles: {
        root: {
          background: '#F1F5F9',
          border: '1px solid #E2E8F0',
          borderRadius: rem(12),
        },
        control: {
          '&:not(:first-child)': { borderLeft: '1px solid #E2E8F0' },
        },
        controlActive: {
          background: '#0052FF',
          color: '#FFFFFF',
        },
        label: {
          color: '#0F172A',
          fontWeight: 500,
          '&[data-active="true"]': { color: '#FFFFFF' },
        },
      },
    },
    Badge: {
      styles: {
        root: {
          background: '#F1F5F9',
          color: '#0F172A',
          fontWeight: 500,
          borderRadius: rem(8),
        },
      },
    },
    NumberInput: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          height: rem(48),
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
          '&::placeholder': { color: '#64748B' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    Textarea: {
      defaultProps: { radius: 'lg' },
      styles: {
        input: {
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          color: '#0F172A',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:focus': { borderColor: '#0052FF', outline: '2px solid #0052FF', outlineOffset: '2px' },
          '&::placeholder': { color: '#64748B' },
        },
        label: { color: '#0F172A', fontWeight: 500, fontSize: rem(14), marginBottom: rem(8) },
      },
    },
    Modal: {
      defaultProps: { radius: 'xl', padding: 'xl' },
      styles: {
        content: { background: '#FFFFFF', border: '1px solid #E2E8F0' },
        overlay: { background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' },
      },
    },
    Table: {
      styles: {
        table: { background: 'transparent' },
        th: {
          color: '#64748B',
          fontWeight: 600,
          fontSize: rem(12),
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '1px solid #E2E8F0',
        },
        td: { borderBottom: '1px solid #E2E8F0', color: '#0F172A' },
      },
    },
  },
  other: {
    tokens: {
      colors: {
        background: '#FAFAFA',
        foreground: '#0F172A',
        muted: '#F1F5F9',
        mutedForeground: '#64748B',
        accent: '#0052FF',
        accentSecondary: '#4D7CFF',
        border: '#E2E8F0',
      },
    },
  },
});
