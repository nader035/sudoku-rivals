import { WritableSignal, Signal } from '@angular/core';

export type SignalFormField<T> = {
  $currentValue: WritableSignal<T>;
  $touched: WritableSignal<boolean>;
  $valid: Signal<boolean>;
  $stateMessage: Signal<string | null>;
};

export function setSignalFormFieldValue<T>(field: SignalFormField<T>, value: T): void {
  field.$currentValue.set(value);
  field.$touched.set(true);
}

export function markSignalFormFieldTouched<T>(field: SignalFormField<T>): void {
  field.$touched.set(true);
}
