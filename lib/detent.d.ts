export type Cap = "ridge" | "dot";
export interface DetentOptions {
  label: string; min: number; max: number; step: number; detentEvery: number; value: number;
  suffix: string; accent: string; cap: Cap; haptics: boolean; sound: boolean;
}
export interface Callbacks { onChange?: (v: number) => void; onDetent?: (v: number) => void; onCommit?: (v: number) => void }
export interface Instance { readonly value: number; readonly options: DetentOptions; set(o: Partial<DetentOptions> & Callbacks): void; focus(): void; destroy(): void }
export const DEFAULTS: DetentOptions;
export function normalize(o: unknown): DetentOptions;
export function mount(host: HTMLElement, o?: Partial<DetentOptions> & Callbacks): Instance;
export function describeDevice(o?: { haptics?: boolean; sound?: boolean }): string;
export function feedbackTier(o: DetentOptions): "haptic" | "sound" | "visual";
export function capabilities(): { vibrate: boolean; ios: boolean; touch: boolean };
export function snap(v: number, o: DetentOptions): number;
export function format(v: number, o: DetentOptions): string;
export function crossings(a: number, b: number, o: DetentOptions): number;
export function rubber(d: number, limit?: number): number;
export function decimalsOf(step: number): number;
export function clamp(v: number, a: number, b: number): number;
export function optionsFromDataset(ds: DOMStringMap): Record<string, string | undefined>;
