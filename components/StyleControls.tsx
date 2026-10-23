"use client";
import { BACKGROUNDS, bgCss } from "@/lib/render/engine";
import type { Background, FontFamily, TextPosition, TextPreset, TextStyle } from "@/lib/types";

const PRESETS: [TextPreset, string][] = [
  ["outline", "White, black outline"],
  ["box", "Black on white boxes"],
  ["dark", "White on dark boxes"],
  ["shadow", "White, soft shadow"],
  ["yellow", "Yellow, black outline"],
  ["meme", "Meme (Impact)"],
];
const POSITIONS: [TextPosition, string][] = [
  ["top", "Top"],
  ["upper", "Upper third"],
  ["middle", "Middle"],
  ["lower", "Lower third"],
];
const FONTS: FontFamily[] = ["Montserrat", "Anton", "Bricolage Grotesque", "Instrument Sans"];

export function StyleControls({
  style,
  onChange,
  background,
  onBackground,
}: {
  style: TextStyle;
  onChange: (s: TextStyle) => void;
  background?: Background;
  onBackground?: (b: Background) => void;
}) {
  const set = (p: Partial<TextStyle>) => onChange({ ...style, ...p });
  return (
    <div className="stack">
      <div className="grid2">
        <label className="field">
          <span className="label">Text style</span>
          <select value={style.preset} onChange={(e) => set({ preset: e.target.value as TextPreset })}>
            {PRESETS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Font</span>
          <select value={style.font} onChange={(e) => set({ font: e.target.value as FontFamily })}>
            {FONTS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Position</span>
          <select value={style.position} onChange={(e) => set({ position: e.target.value as TextPosition })}>
            {POSITIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Size · {style.size}px</span>
          <input type="range" min={52} max={130} step={2} value={style.size} onChange={(e) => set({ size: +e.target.value })} />
        </label>
      </div>
      <label className="row small">
        <input type="checkbox" checked={style.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} /> ALL CAPS
      </label>
      {background && onBackground && (
        <div className="field">
          <span className="label">Fallback background (when no media)</span>
          <div className="swatches">
            {BACKGROUNDS.map((b) => (
              <button key={b} className="swatch" style={{ background: bgCss(b) }} aria-pressed={background === b} aria-label={b} title={b} onClick={() => onBackground(b)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
