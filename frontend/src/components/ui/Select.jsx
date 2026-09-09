'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Select.module.css';

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const Select = ({
  name,
  value,
  onChange,
  placeholder = 'Choose level',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const selected = LEVELS.find((l) => l.value === value);
  const selectedIndex = selected
    ? LEVELS.findIndex((l) => l.value === value)
    : -1;

  const handleSelect = useCallback(
    (val) => {
      setOpen(false);
      setActiveIndex(-1);
      onChange({ target: { name, value: val } });
    },
    [name, onChange],
  );

  const openMenu = useCallback(() => {
    setOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [selectedIndex]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((prev) => {
            const next = prev < LEVELS.length - 1 ? prev + 1 : 0;
            optionRefs.current[next]?.focus();
            return next;
          });
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((prev) => {
            const next = prev > 0 ? prev - 1 : LEVELS.length - 1;
            optionRefs.current[next]?.focus();
            return next;
          });
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (!open) {
          openMenu();
        } else if (activeIndex >= 0) {
          handleSelect(LEVELS[activeIndex].value);
        }
        break;
      }
      case 'Escape': {
        if (open) {
          e.preventDefault();
          closeMenu();
        }
        break;
      }
    }
  };

  return (
    <div
      className={`${styles['wrapper']} ${className}`}
      ref={wrapperRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${name}-listbox`}
        aria-label={placeholder}
        className={`${styles['trigger']} ${open ? styles['trigger-open'] : ''}`}
        onClick={() => setOpen((p) => !p)}
      >
        <span className={value ? styles['value'] : styles['placeholder']}>
          {selected ? selected.label : placeholder}
        </span>

        <DropDownChevron
          width={20}
          height={20}
          className={`${styles['chevron']} ${open ? styles['chevron-open'] : ''}`}
        />
      </button>

      {open && (
        <div
          id={`${name}-listbox`}
          role="listbox"
          aria-label={placeholder}
          className={styles['menu']}
        >
          {LEVELS.map((l, i) => (
            <button
              key={l.value}
              ref={(el) => (optionRefs.current[i] = el)}
              type="button"
              role="option"
              aria-selected={value === l.value}
              tabIndex={-1}
              className={`${styles['option']} ${value === l.value ? styles['option-selected'] : ''} ${activeIndex === i ? styles['option-active'] : ''}`}
              onClick={() => handleSelect(l.value)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DropDownChevron = ({ width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <path
        d="M16.25 6.875L10 13.125L3.75 6.875"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
