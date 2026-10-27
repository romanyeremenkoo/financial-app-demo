import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgControl, type ControlValueAccessor } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

export interface FinSelectOption {
  readonly value: string;
  readonly label: string;
}

const TYPEAHEAD_RESET_MS = 600;

let nextId = 0;

/**
 * Accessible single-choice listbox.
 *
 * A native `<select>` is deliberately avoided: its popup is painted by the
 * operating system, so the rounded, shadowed surface used everywhere else in
 * Financial App cannot be applied to it. This follows the ARIA 1.2 combobox
 * pattern instead — focus stays on the trigger and the active option is
 * advertised through `aria-activedescendant`.
 */
@Component({
  selector: 'fin-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './fin-select.component.html',
})
export class FinSelectComponent implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Self-registration keeps the accessor out of a `forwardRef` provider.
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly FinSelectOption[]>();
  /** Rendered when the current value matches no option. */
  readonly placeholder = input<string>('');
  readonly invalid = input<boolean>(false);
  readonly qa = input<string>('');
  readonly describedBy = input<string | undefined>(undefined);

  protected readonly value = signal('');
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly disabled = signal(false);

  private readonly uid = `fin-select-${String(nextId++)}`;
  private typeahead = { query: '', at: 0 };

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly listId = `${this.uid}-list`;
  protected readonly labelId = `${this.uid}-label`;

  protected readonly selected = computed(
    () => this.options().find((option) => option.value === this.value()) ?? null,
  );

  protected readonly triggerLabel = computed(() => this.selected()?.label ?? this.placeholder());

  protected readonly labelledBy = computed(() => `${this.labelId} ${this.controlId()}`);

  protected readonly optionQa = computed(() => {
    const id = this.qa();
    return id === '' ? null : `${id}-option`;
  });

  constructor() {
    if (this.ngControl !== null) {
      this.ngControl.valueAccessor = this;
    }
  }

  protected optionId(index: number): string {
    return `${this.uid}-option-${String(index)}`;
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // Dismiss on an outside press without swallowing the press itself.
  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen()) {
      return;
    }
    if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    const index = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(index === -1 ? 0 : index);
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected commit(index: number): void {
    const option = this.options().at(index);
    if (option !== undefined) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
    this.isOpen.set(false);
    this.host.nativeElement.querySelector<HTMLElement>('.fin-select__control')?.focus();
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected setActive(index: number): void {
    this.activeIndex.set(index);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.handleNavigationKey(event) || this.handleActionKey(event)) {
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.searchFor(event.key);
    }
  }

  private handleNavigationKey(event: KeyboardEvent): boolean {
    const target = this.navigationTarget(event.key);
    if (target === null) {
      return false;
    }
    event.preventDefault();
    if (this.isOpen()) {
      this.moveTo(target);
    } else {
      this.toggle();
    }
    return true;
  }

  private navigationTarget(key: string): number | null {
    switch (key) {
      case 'ArrowDown':
        return this.activeIndex() + 1;
      case 'ArrowUp':
        return this.activeIndex() - 1;
      case 'Home':
        return 0;
      case 'End':
        return this.options().length - 1;
      default:
        return null;
    }
  }

  private handleActionKey(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen()) {
          this.commit(this.activeIndex());
        } else {
          this.toggle();
        }
        return true;
      case 'Escape':
        if (this.isOpen()) {
          event.stopPropagation();
          this.close();
        }
        return true;
      case 'Tab':
        this.close();
        return true;
      default:
        return false;
    }
  }

  private moveTo(index: number): void {
    const options = this.options();
    if (options.length === 0) {
      return;
    }
    const next = Math.min(Math.max(index, 0), options.length - 1);
    this.activeIndex.set(next);
    this.scrollActiveIntoView(next);
  }

  private searchFor(key: string): void {
    const now = Date.now();
    const query =
      now - this.typeahead.at > TYPEAHEAD_RESET_MS
        ? key.toLowerCase()
        : this.typeahead.query + key.toLowerCase();
    this.typeahead = { query, at: now };

    const options = this.options();
    const match = options.findIndex((option) => option.label.toLowerCase().startsWith(query));
    if (options.at(match) === undefined) {
      return;
    }
    if (this.isOpen()) {
      this.moveTo(match);
    } else {
      this.commit(match);
    }
  }

  private scrollActiveIntoView(index: number): void {
    const option = this.host.nativeElement.querySelector<HTMLElement>(`#${this.optionId(index)}`);
    option?.scrollIntoView({ block: 'nearest' });
  }
}
