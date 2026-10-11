/**
 * Плавная линия через точки графика: монотонная кубическая интерполяция (Фрич–Карлсон).
 *
 * - кривая проходит точно через каждую сделку;
 * - между соседними точками не выходит за их значения — никаких «выдуманных» пиков и провалов;
 * - tension < 1 приглушает изгиб: углы скругляются, но график не превращается в «волну».
 */
export function smoothPath(xy: readonly (readonly [number, number])[], tension = 0.75) {
  const n = xy.length;
  if (n === 0) return "";
  if (n < 3) return xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

  // наклоны отрезков
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xy[i + 1][0] - xy[i][0] || 1e-6);
    slope.push((xy[i + 1][1] - xy[i][1]) / dx[i]);
  }

  // касательные в точках: 0 на экстремумах, иначе гармоническое среднее соседних наклонов
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1];
    const b = slope[i];
    if (a * b <= 0) m.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m.push((w1 + w2) / (w1 / a + w2 / b));
    }
  }
  m.push(slope[n - 2]);

  let d = `M${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = xy[i];
    const [x1, y1] = xy[i + 1];
    const h = (dx[i] / 3) * tension;
    const c1x = x0 + h;
    const c1y = y0 + m[i] * h;
    const c2x = x1 - h;
    const c2y = y1 - m[i + 1] * h;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}
