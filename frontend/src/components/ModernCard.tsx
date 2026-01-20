import { Card, CardProps } from '@mantine/core';

interface ModernCardProps extends Omit<CardProps, 'children'> {
  children: React.ReactNode;
  hoverLift?: boolean;
}

export const ModernCard = ({ hoverLift = true, children, ...props }: ModernCardProps) => {
  return <Card {...props}>{children}</Card>;
};
