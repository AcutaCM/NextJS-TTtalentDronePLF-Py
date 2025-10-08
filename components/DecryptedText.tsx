import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

const styles = {
  wrapper: {
    display: 'inline-block',
    whiteSpace: 'pre-wrap'
  } as React.CSSProperties,
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: 0
  } as React.CSSProperties
};

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'hover' | 'view' | 'both';
  [key: string]: any;
}

export default function DecryptedText({
  text,
  speed = 100,
  maxIterations = 20,
  sequential = true,
  revealDirection = 'start', // 从左到右
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'view',
  ...props
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let currentIteration = 0;

    const getNextIndex = (revealedSet: Set<number>): number => {
      const textLength = text.length;
      switch (revealDirection) {
        case 'start':
          return revealedSet.size; // 从左到右
        case 'end':
          return textLength - 1 - revealedSet.size; // 从右到左
        case 'center': {
          const middle = Math.floor(textLength / 2);
          const offset = Math.floor(revealedSet.size / 2);
          const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;

          if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
            return nextIndex;
          }

          for (let i = 0; i < textLength; i++) {
            if (!revealedSet.has(i)) return i;
          }
          return 0;
        }
        default:
          return revealedSet.size;
      }
    };

    const availableChars = useOriginalCharsOnly
      ? Array.from(new Set(text.split(''))).filter(char => char !== ' ')
      : characters.split('');

    const shuffleText = (originalText: string, currentRevealed: Set<number>): string => {
      return originalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (currentRevealed.has(i)) return originalText[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)];
        })
        .join('');
    };

    if (isHovering) {
      setIsScrambling(true);
      currentIteration = 0;
      
      interval = setInterval(() => {
        setRevealedIndices(prevRevealed => {
          if (prevRevealed.size < text.length) {
            const nextIndex = getNextIndex(prevRevealed);
            const newRevealed = new Set(prevRevealed);
            newRevealed.add(nextIndex);
            setDisplayText(shuffleText(text, newRevealed));
            return newRevealed;
          } else {
            if (interval) clearInterval(interval);
            setIsScrambling(false);
            return prevRevealed;
          }
        });
        
        currentIteration++;
        if (currentIteration >= maxIterations) {
          if (interval) clearInterval(interval);
          setIsScrambling(false);
          setDisplayText(text);
        }
      }, speed);
    } else {
      setDisplayText(text);
      setRevealedIndices(new Set());
      setIsScrambling(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHovering, text, speed, maxIterations, sequential, revealDirection, characters, useOriginalCharsOnly]);

  useEffect(() => {
    if (animateOn !== 'view' && animateOn !== 'both') return;

    const observerCallback: IntersectionObserverCallback = entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsHovering(true);
          setHasAnimated(true);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [animateOn, hasAnimated]);

  const hoverProps =
    animateOn === 'hover' || animateOn === 'both'
      ? {
          onMouseEnter: () => {
            setIsHovering(true);
            setHasAnimated(false);
          },
          onMouseLeave: () => {
            setIsHovering(false);
            setRevealedIndices(new Set());
            setDisplayText(text);
          }
        }
      : {};

  return (
    <motion.span 
      className={parentClassName} 
      ref={containerRef} 
      style={styles.wrapper} 
      {...hoverProps} 
      {...props}
    >
      <span style={styles.srOnly}>{displayText}</span>
      <span aria-hidden="true">
        {displayText.split('').map((char, index) => {
          const isRevealed = revealedIndices.has(index);
          const isCurrentlyScrambling = isScrambling && isHovering;
          
          return (
            <motion.span
              key={index}
              className={isRevealed ? className : encryptedClassName}
              initial={{ opacity: 0.8, filter: 'blur(1px)' }}
              animate={{
                opacity: isRevealed ? 1 : isCurrentlyScrambling ? 0.8 : 1,
                filter: isRevealed ? 'blur(0px)' : isCurrentlyScrambling ? 'blur(1px)' : 'blur(0px)'
              }}
              transition={{ duration: 0.1 }}
              style={{
                display: 'inline-block',
                willChange: 'opacity, filter'
              }}
            >
              {char}
            </motion.span>
          );
        })}
      </span>
    </motion.span>
  );
}