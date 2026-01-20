import { Box, Text } from '@mantine/core';

interface SectionBadgeProps {
  children: React.ReactNode;
  pulse?: boolean;
}

export const SectionBadge = ({ children, pulse = false }: SectionBadgeProps) => {
  return (
    <Box
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px',
        borderRadius: 9999,
        border: '1px solid rgba(0, 82, 255, 0.3)',
        background: 'rgba(0, 82, 255, 0.05)',
      }}
    >
      <Box
        component="span"
        className={pulse ? 'animate-pulse-dot' : ''}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#0052FF',
        }}
      />
      <Text
        component="span"
        size="xs"
        style={{
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#0052FF',
          fontWeight: 400,
        }}
      >
        {children}
      </Text>
    </Box>
  );
};
