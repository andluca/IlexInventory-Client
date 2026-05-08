/**
 * Design tokens — canonical
 * Generated from docs/design/tokens.md. Update both together.
 *
 * Tailwind config and Mantine theme both consume from this file.
 * No value should be defined twice.
 */
export declare const colors: {
    readonly charcoal: "#121212";
    readonly surface: "#1B1B1B";
    readonly surface2: "#2A2A2A";
    readonly border: "#363636";
    readonly text: "#FAFAFA";
    readonly textMuted: "#9C9C9C";
    readonly terere: "#00C16A";
    readonly terereFg: "#121212";
    readonly amber: "#F59E0B";
    readonly amberFg: "#1A1A1A";
    readonly clay: "#DC2626";
    readonly clayFg: "#FAFAFA";
};
export declare const gray: {
    readonly 1: "#121212";
    readonly 2: "#1B1B1B";
    readonly 3: "#2A2A2A";
    readonly 4: "#363636";
    readonly 5: "#9C9C9C";
};
export declare const fontFamily: {
    readonly sans: "Inter, ui-sans-serif, system-ui, sans-serif";
    readonly mono: "'JetBrains Mono', ui-monospace, 'Geist Mono', monospace";
};
/** Type scale: [fontSize, lineHeight] */
export declare const typeScale: {
    readonly display: readonly ["2.25rem", "2.5rem"];
    readonly h1: readonly ["1.5rem", "2rem"];
    readonly h2: readonly ["1rem", "1.5rem"];
    readonly body: readonly ["0.875rem", "1.25rem"];
    readonly bodySm: readonly ["0.8125rem", "1.125rem"];
    readonly caption: readonly ["0.75rem", "1rem"];
    readonly mono: readonly ["0.8125rem", "1.125rem"];
    readonly monoLg: readonly ["1rem", "1.5rem"];
    readonly kpi: readonly ["1.5rem", "1.75rem"];
};
export declare const spacing: {
    readonly xs: "0.25rem";
    readonly sm: "0.5rem";
    readonly md: "0.75rem";
    readonly lg: "1rem";
    readonly xl: "1.5rem";
    readonly '2xl': "2rem";
};
export declare const density: {
    readonly rowHeightDefault: "36px";
    readonly rowHeightFloor: "48px";
    readonly inputHeightDefault: "36px";
    readonly inputHeightFloor: "44px";
};
export declare const radius: {
    readonly sm: "0.25rem";
    readonly md: "0.375rem";
    readonly lg: "0.5rem";
    readonly xl: "0.75rem";
};
export declare const shadows: {
    readonly card: "none";
    readonly modal: "0 8px 32px 0 rgb(0 0 0 / 0.5)";
    readonly popover: "0 4px 16px 0 rgb(0 0 0 / 0.4)";
};
export declare const focus: {
    readonly ringColor: "oklch(0.72 0.19 155 / 0.5)";
    readonly ringOffsetColor: "oklch(0.145 0 0)";
    readonly ringOffsetWidth: "2px";
    readonly ringWidth: "2px";
};
