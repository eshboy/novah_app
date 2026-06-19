interface Props {
  color?: string;
  size?: number;
  opacity?: number;
  thickness?: number;
}

export default function HudCorners({
  color     = '#22D3EE',
  size      = 14,
  opacity   = 0.5,
  thickness = 2,
}: Props) {
  const base = {
    position:      'absolute' as const,
    width:         size,
    height:        size,
    opacity,
    pointerEvents: 'none' as const,
  };

  const border = `${thickness}px solid ${color}`;

  return (
    <>
      <div style={{ ...base, top: 0, left: 0,  borderTop: border,    borderLeft:   border }} />
      <div style={{ ...base, top: 0, right: 0, borderTop: border,    borderRight:  border }} />
      <div style={{ ...base, bottom: 0, left: 0,  borderBottom: border, borderLeft: border }} />
      <div style={{ ...base, bottom: 0, right: 0, borderBottom: border, borderRight: border }} />
    </>
  );
}
