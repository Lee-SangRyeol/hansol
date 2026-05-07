/** 랜덤 게걸림으로 시작해 마지막에 winner 인덱스로 정확히 멈춤 */
export function buildRouletteLandingSequence(
  candidateCount: number,
  winnerIndex: number,
  totalSteps = 44
): number[] {
  if (candidateCount <= 0 || totalSteps < 2) return [];
  const safeWinner = Math.max(0, Math.min(winnerIndex, candidateCount - 1));
  const sequence: number[] = [];
  let current = Math.floor(Math.random() * candidateCount);
  sequence.push(current);
  for (let step = 1; step < totalSteps - 1; step++) {
    const stride = 1 + Math.floor(Math.random() * Math.min(5, candidateCount));
    current = (current + stride) % candidateCount;
    sequence.push(current);
  }
  sequence.push(safeWinner);
  return sequence;
}

/** 초반 빠르고 후반 느린 스텝 길이 (ms), 합이 totalMs와 일치 */
export function splitSpinDurationsEaseOut(stepCount: number, totalMs: number): number[] {
  if (stepCount <= 0) return [];
  if (stepCount === 1) return [totalMs];
  const weights: number[] = [];
  for (let index = 0; index < stepCount; index += 1) {
    const timeline = index / (stepCount - 1);
    weights.push(0.05 + Math.pow(timeline, 2.25));
  }
  const scale = weights.reduce((accumulator, weight) => accumulator + weight, 0);
  return weights.map((weight) => (weight / scale) * totalMs);
}
