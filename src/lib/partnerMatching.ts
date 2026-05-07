/** closeFriends 배열 인덱스가 선호 순위(0이 가장 높음) */

export type MatchingUserLite = {
  _id: string;
  name: string;
  closeFriends: string[];
};

export type ProposedPair = {
  userId1: string;
  userId2: string;
  rank1To2: number;
  rank2To1: number;
  preferenceSum: number;
  mutualFirst: boolean;
};

function getRank(prefers: string[], targetName: string): number | null {
  const i = prefers.indexOf(targetName);
  if (i === -1) return null;
  return i;
}

type MutualEdge = {
  id1: string;
  id2: string;
  rank1To2: number;
  rank2To1: number;
  preferenceSum: number;
};

function edgeSortKey(edge: MutualEdge): string {
  return `${edge.preferenceSum}:${edge.id1}:${edge.id2}`;
}

/** 상호 선택(각자 상대 이름이 본인 closeFriends 안에 있음)인 간선만 허용 (요구조건 1) */
export function proposePartnerMatching(users: MatchingUserLite[]): {
  pairs: ProposedPair[];
  unmatchedIds: string[];
} {
  const ids = users.map((u) => u._id);
  const byId = new Map(users.map((u) => [u._id, u]));
  const mutual: MutualEdge[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const u1 = byId.get(ids[i]);
      const u2 = byId.get(ids[j]);
      if (!u1 || !u2) continue;
      const rank1To2 = getRank(u1.closeFriends, u2.name);
      const rank2To1 = getRank(u2.closeFriends, u1.name);
      if (rank1To2 === null || rank2To1 === null) continue;
      mutual.push({
        id1: u1._id,
        id2: u2._id,
        rank1To2,
        rank2To1,
        preferenceSum: rank1To2 + rank2To1,
      });
    }
  }

  mutual.sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));

  const matched = new Set<string>();
  const pairs: ProposedPair[] = [];

  // 3. 서로 1순위(인덱스 0) → 최우선 매칭
  const mutualFirstEdges = [...mutual]
    .filter((m) => m.rank1To2 === 0 && m.rank2To1 === 0)
    .sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));

  const pushPair = (edge: MutualEdge) => {
    pairs.push({
      userId1: edge.id1,
      userId2: edge.id2,
      rank1To2: edge.rank1To2,
      rank2To1: edge.rank2To1,
      preferenceSum: edge.preferenceSum,
      mutualFirst:
        edge.rank1To2 === 0 && edge.rank2To1 === 0,
    });
    matched.add(edge.id1);
    matched.add(edge.id2);
  };

  for (const edge of mutualFirstEdges) {
    if (matched.has(edge.id1) || matched.has(edge.id2)) continue;
    pushPair(edge);
  }

  // 2. 남은 인원 중 상호 간선만으로, 순위 합이 작을수록 우선하여 탐욕 매칭
  while (true) {
    let best: MutualEdge | null = null;
    let bestKey = "";
    for (const edge of mutual) {
      if (matched.has(edge.id1) || matched.has(edge.id2)) continue;
      const key = edgeSortKey(edge);
      if (!best || key.localeCompare(bestKey) < 0) {
        best = edge;
        bestKey = key;
      }
    }
    if (!best) break;
    pushPair(best);
  }

  const unmatchedIds = ids.filter((id) => !matched.has(id));

  pairs.sort((a, b) => {
    const m = Number(b.mutualFirst) - Number(a.mutualFirst);
    if (m !== 0) return m;
    const s = a.preferenceSum - b.preferenceSum;
    if (s !== 0) return s;
    return `${a.userId1}:${a.userId2}`.localeCompare(`${b.userId1}:${b.userId2}`);
  });

  return { pairs, unmatchedIds };
}
