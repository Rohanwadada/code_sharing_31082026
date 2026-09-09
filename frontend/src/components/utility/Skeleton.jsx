import { motion } from 'framer-motion';
import styles from './Skeleton.module.css';

/**
 * Skeleton component for loading states
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Skeleton variant (text, avatar, card, button, input)
 * @param {number|string} props.width - Width in pixels or percentage (e.g. "100%")
 * @param {number} props.height - Height in pixels
 * @param {boolean} props.animated - Whether to animate the skeleton
 * @param {string} props.animationType - Animation type: "pulse" | "wave"
 * @param {number} props.count - Number of skeleton items to render
 * @param {number} props.gap - Gap between multiple items
 * @param {boolean} props.circle - Whether to render as circle
 * @param {string} props.baseColor - Base color (overrides theme)
 * @param {string} props.highlightColor - Highlight color (overrides theme)
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animated = true,
  animationType = 'pulse',
  count = 1,
  gap = 8,
  circle = false,
  baseColor,
  highlightColor,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'avatar':
        return {
          width: width || 40,
          height: height || 40,
          borderRadius: '9999px',
          flexShrink: 0,
        };
      case 'button':
        return {
          width: width || 80,
          height: height || 36,
          borderRadius: '20px',
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || 200,
          borderRadius: '8px',
        };
      case 'input':
        return {
          width: width || '100%',
          height: height || 40,
          borderRadius: '6px',
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || 20,
          borderRadius: '4px',
        };
    }
  };

  const pulseAnimation = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.6, 0.8, 0.6, 0.4],
      transition: {
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
      },
    },
  };

  const waveAnimation = {
    initial: { x: '-100%' },
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };

  const renderSkeletonItems = () => {
    return Array(count)
      .fill(0)
      .map((_, index) => {
        const variantStyles = getVariantStyles();

        return (
          <motion.div
            key={index}
            className={`${styles.skeleton} ${props.className || ''}`}
            style={{
              ...variantStyles,
              marginBottom: index < count - 1 ? gap : 0,
              borderRadius: circle ? '9999px' : variantStyles.borderRadius,
              backgroundColor: baseColor || undefined,
              position: 'relative',
              overflow: 'hidden',
            }}
            initial={animated && animationType === 'pulse' ? 'initial' : false}
            animate={animated && animationType === 'pulse' ? 'animate' : false}
            variants={animationType === 'pulse' ? pulseAnimation : {}}
            {...props}
          >
            {animated && animationType === 'wave' && (
              <motion.div
                className={styles.wave}
                variants={waveAnimation}
                initial="initial"
                animate="animate"
              />
            )}
          </motion.div>
        );
      });
  };

  return <>{renderSkeletonItems()}</>;
}

export default Skeleton;
