// Saved order determines ties; a full-width message starts below every column.
export function cardColumns(width, gap, maximum) {
  return Math.max(1, Math.min(maximum, Math.floor((width + gap) / (300 + gap))));
}

export function packCards(cards, { width, columns, gap }) {
  const columnWidth = (width - (columns - 1) * gap) / columns;
  const bottoms = Array(columns).fill(0);
  const positions = cards.map(({ height, fullWidth }) => {
    const top = fullWidth ? Math.max(...bottoms) : Math.min(...bottoms);
    const column = fullWidth ? 0 : bottoms.indexOf(top);
    if (fullWidth) bottoms.fill(top + height + gap);
    else bottoms[column] = top + height + gap;
    return { left: column * (columnWidth + gap), top };
  });
  return { positions, height: Math.max(0, ...bottoms) - (cards.length ? gap : 0) };
}
