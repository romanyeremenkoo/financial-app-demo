import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface FinSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface FinSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly FinSelectOption[];
  readonly onChange: (value: string) => void;
  /** Rendered when `value` matches no option, e.g. an unfilled transfer field. */
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly qa?: string;
  readonly describedBy?: string;
  readonly onBlur?: () => void;
}

const TYPEAHEAD_RESET_MS = 600;

/**
 * Accessible single-choice listbox.
 *
 * A native `<select>` is deliberately avoided: its popup is painted by the
 * operating system, so the rounded, shadowed surface used everywhere else in
 * Financial App cannot be applied to it. This follows the ARIA 1.2 combobox
 * pattern instead — focus stays on the trigger and the active option is
 * advertised through `aria-activedescendant`.
 */
export const FinSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  invalid = false,
  disabled = false,
  qa,
  describedBy,
  onBlur,
}: FinSelectProps) => {
  const generatedId = useId();
  const listId = `${generatedId}-list`;
  const labelId = `${generatedId}-label`;
  const optionId = (index: number): string => `${generatedId}-option-${String(index)}`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ query: '', at: 0 });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex === -1 ? null : options[selectedIndex];

  const open = useCallback(() => {
    setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex);
    setIsOpen(true);
  }, [selectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (option !== undefined) {
        onChange(option.value);
      }
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options],
  );

  // Dismiss on an outside press without swallowing the press itself.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent): void => {
      const root = rootRef.current;
      if (root !== null && event.target instanceof Node && !root.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const option = document.getElementById(optionId(activeIndex));
    // jsdom and older engines do not implement scrollIntoView.
    if (typeof option?.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
    // `optionId` is derived from a stable generated id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex]);

  const moveTo = (index: number): void => {
    if (options.length === 0) {
      return;
    }
    setActiveIndex(Math.min(Math.max(index, 0), options.length - 1));
  };

  const searchFor = (key: string): void => {
    const now = Date.now();
    const query =
      now - typeahead.current.at > TYPEAHEAD_RESET_MS
        ? key.toLowerCase()
        : typeahead.current.query + key.toLowerCase();
    typeahead.current = { query, at: now };

    const match = options.findIndex((option) => option.label.toLowerCase().startsWith(query));
    const matched = options[match];
    if (matched === undefined) {
      return;
    }
    if (isOpen) {
      setActiveIndex(match);
    } else {
      onChange(matched.value);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) {
          moveTo(activeIndex + 1);
        } else {
          open();
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          moveTo(activeIndex - 1);
        } else {
          open();
        }
        return;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          moveTo(0);
        }
        return;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          moveTo(options.length - 1);
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          commit(activeIndex);
        } else {
          open();
        }
        return;
      case 'Escape':
        if (isOpen) {
          event.stopPropagation();
          close();
        }
        return;
      case 'Tab':
        close();
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          searchFor(event.key);
        }
    }
  };

  const triggerLabel = selectedOption?.label ?? placeholder ?? '';

  return (
    <>
      <span className="fin-label" id={labelId}>
        {label}
      </span>
      <div
        className={`fin-select${isOpen ? ' fin-select--open' : ''}`}
        ref={rootRef}
        data-qa-field={qa}
      >
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`fin-select__control${invalid ? ' is-invalid' : ''}`}
          role="combobox"
          aria-controls={listId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={`${labelId} ${id}`}
          aria-activedescendant={isOpen ? optionId(activeIndex) : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          disabled={disabled}
          data-qa={qa}
          data-value={value}
          onClick={() => {
            if (isOpen) {
              close();
            } else {
              open();
            }
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        >
          <span
            className={`fin-select__value${selectedOption === null ? ' fin-select__value--placeholder' : ''}`}
          >
            {triggerLabel}
          </span>
          <span className="fin-select__chevron" aria-hidden="true">
            <Icon name="chevron-down" size={18} />
          </span>
        </button>

        {isOpen ? (
          <div className="fin-select__list" id={listId} role="listbox" aria-labelledby={labelId}>
            {options.map((option, index) => (
              <button
                key={option.value}
                id={optionId(index)}
                type="button"
                tabIndex={-1}
                role="option"
                aria-selected={option.value === value}
                className={`fin-select__option${index === activeIndex ? ' fin-select__option--active' : ''}${
                  option.value === value ? ' fin-select__option--selected' : ''
                }`}
                data-qa={qa === undefined ? undefined : `${qa}-option`}
                data-value={option.value}
                onPointerMove={() => {
                  setActiveIndex(index);
                }}
                onClick={() => {
                  commit(index);
                }}
              >
                <span className="fin-select__option-label">{option.label}</span>
                {option.value === value ? (
                  <span className="fin-select__check" aria-hidden="true">
                    <Icon name="check" size={16} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
};
