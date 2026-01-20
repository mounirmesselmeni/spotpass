/**
 * EditorialText Component
 * Oversized serif typography for headlines and display text
 */

import { Title, TitleProps, Text, TextProps } from '@mantine/core';
import styles from './EditorialText.module.css';

interface EditorialTitleProps extends Omit<TitleProps, 'children'> {
  children: React.ReactNode;
  size?: 'display' | 'hero' | 'large' | 'medium';
}

export const EditorialTitle = ({ 
  children,
  size = 'large',
  className = '',
  order = 1,
  ...props 
}: EditorialTitleProps) => {
  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
  
  return (
    <Title
      order={order}
      className={`${styles.editorialTitle} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </Title>
  );
};

interface EditorialBodyProps extends Omit<TextProps, 'children'> {
  children: React.ReactNode;
  lead?: boolean;
}

export const EditorialBody = ({ 
  children,
  lead = false,
  className = '',
  ...props 
}: EditorialBodyProps) => {
  return (
    <Text
      className={`${styles.editorialBody} ${lead ? styles.lead : ''} ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
};

interface EditorialLabelProps extends Omit<TextProps, 'children'> {
  children: React.ReactNode;
}

export const EditorialLabel = ({ 
  children,
  className = '',
  ...props 
}: EditorialLabelProps) => {
  return (
    <Text
      className={`${styles.editorialLabel} ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
};
