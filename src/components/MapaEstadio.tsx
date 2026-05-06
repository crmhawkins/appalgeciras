import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Ellipse,
  Line,
  Text as SvgText,
  G,
  Circle,
} from 'react-native-svg';

export interface MapaEstadioProps {
  gradaActiva?: string;
  onZonaPress?: (nombreZona: string) => void;
}

// ─── zone matching ────────────────────────────────────────────────────────────
type ZonaKey =
  | 'tribuna'
  | 'fondo_norte'
  | 'fondo_sur'
  | 'lateral_este'
  | 'lateral_oeste'
  | 'preferente'
  | 'vip';

function detectZona(nombre?: string): ZonaKey | null {
  if (!nombre) return null;
  const n = nombre.toLowerCase();
  if (n.includes('vip') || n.includes('palco')) return 'vip';
  if (n.includes('preferente')) return 'preferente';
  if (n.includes('norte') || n.includes('fondo n')) return 'fondo_norte';
  if (n.includes('sur') || n.includes('fondo s')) return 'fondo_sur';
  if (n.includes('oeste')) return 'lateral_oeste';
  if (n.includes('lateral') || n.includes('este')) return 'lateral_este';
  if (n.includes('tribuna')) return 'tribuna';
  return null;
}

// ─── colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#1a1a2e',
  field: '#2d5a27',
  fieldLine: '#ffffff',
  zone: '#4a4a5a',
  zoneActive: '#C8102E',
  zoneText: '#ffffff',
  zoneActiveBorder: '#ff4444',
  dirt: '#1e3a18',
};

// ─── viewBox constants ────────────────────────────────────────────────────────
// Total: 320 × 240
const VW = 320;
const VH = 240;

// Field rect (centered)
const FX = 72;   // left edge
const FY = 42;   // top edge
const FW = 176;  // width
const FH = 156;  // height

// Zone rects (surrounding field)
const ZONES: Record<
  ZonaKey,
  { x: number; y: number; w: number; h: number; label: string; labelX: number; labelY: number }
> = {
  fondo_norte: {
    x: FX, y: 4, w: FW, h: FY - 8,
    label: 'FONDO NORTE',
    labelX: FX + FW / 2, labelY: 4 + (FY - 8) / 2,
  },
  fondo_sur: {
    x: FX, y: FY + FH + 4, w: FW, h: VH - (FY + FH + 4) - 4,
    label: 'FONDO SUR',
    labelX: FX + FW / 2, labelY: FY + FH + 4 + (VH - (FY + FH + 4) - 4) / 2,
  },
  lateral_oeste: {
    x: 4, y: FY, w: FX - 8, h: FH,
    label: 'L.OESTE',
    labelX: 4 + (FX - 8) / 2, labelY: FY + FH / 2,
  },
  // Tribuna = right lateral principal (full height)
  tribuna: {
    x: FX + FW + 4, y: FY, w: VW - (FX + FW + 4) - 4, h: FH * 0.65,
    label: 'TRIBUNA',
    labelX: FX + FW + 4 + (VW - (FX + FW + 4) - 4) / 2,
    labelY: FY + (FH * 0.65) / 2,
  },
  preferente: {
    x: FX + FW + 4,
    y: FY + FH * 0.65 + 2,
    w: VW - (FX + FW + 4) - 4,
    h: FH * 0.2,
    label: 'PREF.',
    labelX: FX + FW + 4 + (VW - (FX + FW + 4) - 4) / 2,
    labelY: FY + FH * 0.65 + 2 + FH * 0.1,
  },
  vip: {
    x: FX + FW + 4,
    y: FY + FH * 0.65 + 2 + FH * 0.2 + 2,
    w: VW - (FX + FW + 4) - 4,
    h: FH * 0.15 - 4,
    label: 'VIP',
    labelX: FX + FW + 4 + (VW - (FX + FW + 4) - 4) / 2,
    labelY: FY + FH * 0.65 + 2 + FH * 0.2 + 2 + (FH * 0.15 - 4) / 2,
  },
  lateral_este: {
    x: 4, y: FY, w: FX - 8, h: FH,
    // hidden — same rect as oeste but never both active simultaneously
    label: 'L.ESTE',
    labelX: 4 + (FX - 8) / 2, labelY: FY + FH / 2,
  },
};

// Note: lateral_este and lateral_oeste share the same left rect position.
// Normally a stadium has them on opposite sides; here L.ESTE takes the right
// slot if it's active but lateral_oeste is not. We handle in render.

export default function MapaEstadio({ gradaActiva, onZonaPress }: MapaEstadioProps) {
  const activeZona = detectZona(gradaActiva);

  // For lateral_este: render on left side only when lateral_oeste is NOT active
  // Both share the same side (left) since the right side is split tribuna/pref/vip

  function zoneColor(key: ZonaKey) {
    return activeZona === key ? C.zoneActive : C.zone;
  }

  function ZoneRect({ zkey }: { zkey: ZonaKey }) {
    const z = ZONES[zkey];
    const active = activeZona === zkey;
    // lateral_este rendered on left same as oeste — only when oeste not active
    if (zkey === 'lateral_este') {
      // re-use oeste rect coords but show only when lateral_este is active
      const zo = ZONES.lateral_oeste;
      if (!active) return null;
      return (
        <G key={zkey}>
          <Rect
            x={zo.x} y={zo.y} width={zo.w} height={zo.h}
            rx={4} fill={C.zoneActive} stroke={C.zoneActiveBorder} strokeWidth={1.5}
          />
          <SvgText
            x={zo.labelX} y={zo.labelY}
            fill={C.zoneText} fontSize={7} fontWeight="bold"
            textAnchor="middle" alignmentBaseline="middle"
          >
            {z.label}
          </SvgText>
        </G>
      );
    }

    return (
      <G key={zkey} onPress={onZonaPress ? () => onZonaPress(z.label) : undefined}>
        <Rect
          x={z.x} y={z.y} width={z.w} height={z.h}
          rx={4}
          fill={zoneColor(zkey)}
          stroke={active ? C.zoneActiveBorder : 'transparent'}
          strokeWidth={active ? 1.5 : 0}
        />
        <SvgText
          x={z.labelX} y={z.labelY}
          fill={C.zoneText}
          fontSize={zkey === 'fondo_norte' || zkey === 'fondo_sur' ? 9 : 7}
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {z.label}
        </SvgText>
      </G>
    );
  }

  // Field line helpers
  const mx = FX + FW / 2; // midline x
  const my = FY + FH / 2; // midline y

  // Penalty areas (top & bottom)
  const paW = FW * 0.52;
  const paH = FH * 0.18;
  const paX = FX + (FW - paW) / 2;

  // Goal areas
  const gaW = FW * 0.26;
  const gaH = FH * 0.07;
  const gaX = FX + (FW - gaW) / 2;

  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <Rect x={0} y={0} width={VW} height={VH} fill={C.bg} rx={8} />

        {/* Zones — behind field */}
        <ZoneRect zkey="fondo_norte" />
        <ZoneRect zkey="fondo_sur" />
        {/* left side: oeste or este */}
        {activeZona === 'lateral_este'
          ? <ZoneRect zkey="lateral_este" />
          : <ZoneRect zkey="lateral_oeste" />}
        <ZoneRect zkey="tribuna" />
        <ZoneRect zkey="preferente" />
        <ZoneRect zkey="vip" />

        {/* ─── Football field ─────────────────────────────────── */}
        {/* Field surface */}
        <Rect x={FX} y={FY} width={FW} height={FH} fill={C.field} rx={2} />

        {/* Stripe shading (subtle) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Rect
            key={`stripe-${i}`}
            x={FX} y={FY + i * (FH / 8)} width={FW} height={FH / 16}
            fill="rgba(0,0,0,0.06)"
          />
        ))}

        {/* Outer border */}
        <Rect
          x={FX} y={FY} width={FW} height={FH}
          fill="none" stroke={C.fieldLine} strokeWidth={1.2} rx={2}
        />

        {/* Halfway line */}
        <Line x1={FX} y1={my} x2={FX + FW} y2={my} stroke={C.fieldLine} strokeWidth={1} />

        {/* Centre circle */}
        <Circle cx={mx} cy={my} r={FH * 0.14} fill="none" stroke={C.fieldLine} strokeWidth={1} />
        <Circle cx={mx} cy={my} r={2} fill={C.fieldLine} />

        {/* Penalty area top */}
        <Rect
          x={paX} y={FY} width={paW} height={paH}
          fill="none" stroke={C.fieldLine} strokeWidth={1}
        />
        {/* Goal area top */}
        <Rect
          x={gaX} y={FY} width={gaW} height={gaH}
          fill="none" stroke={C.fieldLine} strokeWidth={1}
        />
        {/* Penalty spot top */}
        <Circle cx={mx} cy={FY + paH * 0.7} r={1.5} fill={C.fieldLine} />

        {/* Penalty area bottom */}
        <Rect
          x={paX} y={FY + FH - paH} width={paW} height={paH}
          fill="none" stroke={C.fieldLine} strokeWidth={1}
        />
        {/* Goal area bottom */}
        <Rect
          x={gaX} y={FY + FH - gaH} width={gaW} height={gaH}
          fill="none" stroke={C.fieldLine} strokeWidth={1}
        />
        {/* Penalty spot bottom */}
        <Circle cx={mx} cy={FY + FH - paH * 0.7} r={1.5} fill={C.fieldLine} />

        {/* Corner arcs */}
        <Ellipse cx={FX} cy={FY} rx={5} ry={5} fill="none" stroke={C.fieldLine} strokeWidth={1} />
        <Ellipse cx={FX + FW} cy={FY} rx={5} ry={5} fill="none" stroke={C.fieldLine} strokeWidth={1} />
        <Ellipse cx={FX} cy={FY + FH} rx={5} ry={5} fill="none" stroke={C.fieldLine} strokeWidth={1} />
        <Ellipse cx={FX + FW} cy={FY + FH} rx={5} ry={5} fill="none" stroke={C.fieldLine} strokeWidth={1} />

        {/* Active zone label overlay at top */}
        {activeZona && gradaActiva && (
          <>
            <Rect x={VW / 2 - 70} y={VH - 20} width={140} height={16} rx={8} fill="rgba(200,16,46,0.85)" />
            <SvgText
              x={VW / 2} y={VH - 12}
              fill="#fff" fontSize={8} fontWeight="bold"
              textAnchor="middle" alignmentBaseline="middle"
            >
              {gradaActiva.toUpperCase()}
            </SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
