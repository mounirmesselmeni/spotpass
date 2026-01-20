import { Button, ButtonProps } from '@mantine/core';

interface ModernButtonProps extends Omit<ButtonProps, 'children' | 'gradient'> {
  children: React.ReactNode;
  gradient?: boolean;
  type?: 'submit' | 'button' | 'reset';
}

export const ModernButton = ({
  gradient = false,
  children,
  className = '',
  ...props
}: ModernButtonProps) => {
  const gradientStyle = gradient
    ? {
        background: 'linear-gradient(to right, #0052FF, #4D7CFF)',
        color: '#FFFFFF',
        border: 'none',
      }
    : {};

  return (
    <Button className={className} style={gradientStyle} {...props}>
      {children}
    </Button>
  );
};
