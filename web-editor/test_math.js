const r = 0.8;
const C1 = { x: 0, y: 5 };
const C2 = { x: 12.39, y: -1.1 };
const m1 = { x: -0.8, y: -1.8 }; // hang=p_main.left

function getTangents(point, circle, r) {
  const dx = circle.x - point.x;
  const dy = circle.y - point.y;
  const d = Math.hypot(dx, dy);
  if (d <= r) return [];
  const beta = Math.asin(r / d);
  const phi = Math.atan2(dy, dx);
  return [
    { x: circle.x + r * Math.cos(phi + beta + Math.PI / 2), y: circle.y + r * Math.sin(phi + beta + Math.PI / 2) },
    { x: circle.x + r * Math.cos(phi - beta - Math.PI / 2), y: circle.y + r * Math.sin(phi - beta - Math.PI / 2) }
  ];
}

function pickTangent(tangents, method) {
  const T1 = tangents[0];
  const T2 = tangents[1];
  if (method === "over") return T1.y > T2.y ? T1 : T2;
  if (method === "under") return T1.y < T2.y ? T1 : T2;
  return T1;
}

const T_in_C1 = pickTangent(getTangents(m1, C1, r), "over");
console.log("T_in(C1):", T_in_C1);

function getCommonTangents(C1, r1, C2, r2) {
  const dx = C2.x - C1.x;
  const dy = C2.y - C1.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const tangents = [];
  const betaOuter = Math.asin((r1 - r2) / d);
  tangents.push({
    p1: { x: C1.x + r1 * Math.cos(phi + Math.PI / 2 + betaOuter), y: C1.y + r1 * Math.sin(phi + Math.PI / 2 + betaOuter) },
    p2: { x: C2.x + r2 * Math.cos(phi + Math.PI / 2 + betaOuter), y: C2.y + r2 * Math.sin(phi + Math.PI / 2 + betaOuter) }
  });
  tangents.push({
    p1: { x: C1.x + r1 * Math.cos(phi - Math.PI / 2 - betaOuter), y: C1.y + r1 * Math.sin(phi - Math.PI / 2 - betaOuter) },
    p2: { x: C2.x + r2 * Math.cos(phi - Math.PI / 2 - betaOuter), y: C2.y + r2 * Math.sin(phi - Math.PI / 2 - betaOuter) }
  });
  if (d > r1 + r2) {
    const betaInner = Math.asin((r1 + r2) / d);
    tangents.push({
      p1: { x: C1.x + r1 * Math.cos(phi + Math.PI / 2 - betaInner), y: C1.y + r1 * Math.sin(phi + Math.PI / 2 - betaInner) },
      p2: { x: C2.x + r2 * Math.cos(phi - Math.PI / 2 - betaInner), y: C2.y + r2 * Math.sin(phi - Math.PI / 2 - betaInner) }
    });
    tangents.push({
      p1: { x: C1.x + r1 * Math.cos(phi - Math.PI / 2 + betaInner), y: C1.y + r1 * Math.sin(phi - Math.PI / 2 + betaInner) },
      p2: { x: C2.x + r2 * Math.cos(phi + Math.PI / 2 + betaInner), y: C2.y + r2 * Math.sin(phi + Math.PI / 2 + betaInner) }
    });
  }
  return tangents;
}

function pickCommonTangent(tangents, method1, method2) {
  const scorePoint = (p, method) => {
    if (method === "over") return p.y;
    if (method === "under") return -p.y;
    return 0;
  };
  let bestScore = -Infinity;
  let bestTangent = tangents[0];
  for (const t of tangents) {
    const score = scorePoint(t.p1, method1) + scorePoint(t.p2, method2);
    console.log("tangent score:", t, score);
    if (score > bestScore) {
      bestScore = score;
      bestTangent = t;
    }
  }
  return bestTangent;
}

const commonT = getCommonTangents(C1, r, C2, r);
const pickedPair = pickCommonTangent(commonT, "over", "under");
console.log("pickedPair:", pickedPair);
