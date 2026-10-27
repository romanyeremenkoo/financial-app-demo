import type { CSSProperties } from 'react';
import './skeleton.scss';

export interface SkeletonProps {
  readonly width?: string;
  readonly height?: string;
}

/**
 * Shimmer placeholder used while the dataset is loading.
 *
 * Dimensions are passed as custom properties rather than literal style rules so
 * the visual treatment stays entirely in the stylesheet.
 */
export const Skeleton = ({ width = '100%', height = '16px' }: SkeletonProps) => {
  const size = { '--skeleton-width': width, '--skeleton-height': height } as CSSProperties;
  return <span className="skeleton" style={size} aria-hidden="true" />;
};
