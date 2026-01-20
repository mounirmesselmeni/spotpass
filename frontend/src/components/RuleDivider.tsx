/**
 * RuleDivider Component
 * Horizontal rules for section division - line-based visual system
 */

import { Divider, DividerProps } from '@mantine/core';
import styles from './RuleDivider.module.css';

type RuleWeight = 'thin' | 'medium' | 'thick' | 'ultra';

interface RuleDividerProps extends Omit<DividerProps, 'children'> {
  weight?: RuleWeight;
}

export const RuleDivider = ({ 
  weight = 'thin',
  className = '',
  ...props 
}: RuleDividerProps) => {
  const weightClass = styles[weight];
  
  return (
    <Divider
      className={`${styles.ruleDivider} ${weightClass} ${className}`}
      {...props}
    />
  );
};
