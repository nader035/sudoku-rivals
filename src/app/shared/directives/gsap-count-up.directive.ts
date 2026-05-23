import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appGsapCountUp]',
  standalone: true,
})
export class GsapCountUpDirective implements AfterViewInit, OnChanges, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private tween: any | null = null;
  private viewReady = false;
  private currentValue = 0;

  @Input({ alias: 'appGsapCountUp' }) value: number | string | null = 0;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderValue(0);
    this.animateToValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady || !changes['value']) return;
    this.animateToValue();
  }

  ngOnDestroy(): void {
    this.tween?.kill();
    this.tween = null;
  }

  private animateToValue(): void {
    const nextValue = this.parseValue(this.value);
    const gsap = this.getGsap();

    if (!gsap || this.prefersReducedMotion()) {
      this.currentValue = nextValue;
      this.renderValue(nextValue);
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.tween?.kill();
      const state = { value: this.currentValue };
      this.tween = gsap.to(state, {
        value: nextValue,
        duration: 0.72,
        ease: 'power2.out',
        onUpdate: () => this.renderValue(state.value),
        onComplete: () => {
          this.currentValue = nextValue;
          this.renderValue(nextValue);
        },
      });
    });
  }

  private renderValue(value: number): void {
    const suffix = typeof this.value === 'string' && this.value.trim().endsWith('%') ? '%' : '';
    this.element.nativeElement.textContent = `${Math.round(value).toLocaleString()}${suffix}`;
  }

  private parseValue(value: number | string | null): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getGsap(): any | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { gsap?: any }).gsap ?? null;
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
