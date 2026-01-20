import { Text, TextProps } from '@mantine/core';

interface GradientTextProps extends Omit<TextProps, 'children'> {
  children: React.ReactNode;
}

export const GradientText = ({ children, className = '', ...props }: GradientTextProps) => {
  return (
    <Text
      component="span"
      className={`gradient-text ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
};
