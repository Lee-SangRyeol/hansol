/** AI에게 전달할 매칭 규칙 문구 (복사용) */
export const MATCHING_PROMPT_RULES_KO = `코람엠티 단짝(2인 1조)을 정하는 운영 규칙이다. 아래 JSON의 participants만을 기준으로 모든 미매칭 참가자를 짝 지어야 한다.

1. 본인이 선택한 3인 짱칭 목록에 없는 사람과는 매칭될 수 없다. (서로의 이름이 상대의 1·2·3순위 안에 모두 포함될 때만 짝이 될 수 있다.)
2. 1번 규칙을 지키면서, 서로 상대를 1순위로 선택한 쌍이 있으면 즉시 둘을 매칭한다.
3. 2번까지 반영한 뒤 남은 인원 중, 1번을 지키면서 한쪽은 상대를 1순위, 다른 쪽은 같은 상대를 2순위로 선택한 쌍이 있으면 매칭한다.
4. 2·3번을 반영한 뒤 남은 인원 중, 1번을 지키면서 (한쪽은 상대를 1순위·다른 쪽은 같은 상대를 3순위로 선택) 또는 (서로가 상대를 각각 3순위로만 선택한 경우, 즉 3순위↔3순위)면 매칭한다.
5. 위 1~4를 모두 적용한 뒤에도 남은 인원은, 1번 규칙을 유지하는 범위에서만 남은 인원끼리 무작위로 짝을 짓는다.`;

export const AI_RESPONSE_FORMAT_KO = `배정 결과는 관리 도구에서 그대로 파싱해 적용한다. 마크다운 코드펜스나 설명 문장을 덧붙이지 않고 단일 JSON 객체만 출력한다.

스키마:
{
  "pairs": [
    { "userName1": "참가자A이름", "userName2": "참가자B이름" }
  ]
}

pairs의 각 원소는 짝 하나다. 이름은 participants의 name 필드와 정확히 일치해야 한다. 모든 참가자는 정확히 한 번씩만 다른 한 사람과 쌍을 이뤄야 한다(홀수 등 불가피하면 스스로 검토 후 pairs를 완결시킨다).`;

export type ParticipantExportRow = {
  name: string;
  rank1: string;
  rank2: string;
  rank3: string;
};

export function buildParticipantRows(
  users: Array<{ name: string; closeFriends?: string[] }>
): ParticipantExportRow[] {
  return users
    .filter((userRow) => {
      const prefs = userRow.closeFriends;
      return (
        Array.isArray(prefs) &&
        prefs.length === 3 &&
        prefs.every((entry) => String(entry ?? "").trim().length > 0)
      );
    })
    .map((userRow) => ({
      name: userRow.name,
      rank1: userRow.closeFriends![0],
      rank2: userRow.closeFriends![1],
      rank3: userRow.closeFriends![2],
    }))
    .sort((rowA, rowB) => rowA.name.localeCompare(rowB.name, "ko"));
}

export function buildParticipantsOnlyJson(users: ParticipantExportRow[]): string {
  return JSON.stringify({ participants: users }, null, 2);
}

export function buildFullAiPrompt(users: ParticipantExportRow[]): string {
  const jsonBlock = buildParticipantsOnlyJson(users);
  return `${MATCHING_PROMPT_RULES_KO}

다음은 참가자 이름과 온보딩에서 고른 1·2·3순위 짱칭 데이터이다.

${jsonBlock}

${AI_RESPONSE_FORMAT_KO}`;
}

export type ParsedNamePair = { name1: string; name2: string };

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}

function pickPair(obj: Record<string, unknown>): ParsedNamePair | null {
  if (
    typeof obj.userName1 === "string" &&
    typeof obj.userName2 === "string" &&
    obj.userName1.trim() &&
    obj.userName2.trim()
  ) {
    return { name1: obj.userName1.trim(), name2: obj.userName2.trim() };
  }
  if (
    typeof obj.name1 === "string" &&
    typeof obj.name2 === "string" &&
    obj.name1.trim() &&
    obj.name2.trim()
  ) {
    return { name1: obj.name1.trim(), name2: obj.name2.trim() };
  }
  if (
    typeof obj.a === "string" &&
    typeof obj.b === "string" &&
    obj.a.trim() &&
    obj.b.trim()
  ) {
    return { name1: obj.a.trim(), name2: obj.b.trim() };
  }
  if (
    typeof obj.user1 === "string" &&
    typeof obj.user2 === "string" &&
    obj.user1.trim() &&
    obj.user2.trim()
  ) {
    return { name1: obj.user1.trim(), name2: obj.user2.trim() };
  }
  return null;
}

export function parseAiMatchPairsJson(raw: string): ParsedNamePair[] {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error("JSON 형식이 올바르지 않습니다.");
  }

  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const fromPairs = record.pairs ?? record.matchPairs ?? record.results;
    if (Array.isArray(fromPairs)) {
      list = fromPairs;
    }
  }

  const out: ParsedNamePair[] = [];
  for (const item of list) {
    if (Array.isArray(item) && item.length >= 2) {
      const name1 = String(item[0] ?? "").trim();
      const name2 = String(item[1] ?? "").trim();
      if (name1 && name2 && name1 !== name2) out.push({ name1, name2 });
      continue;
    }
    if (item && typeof item === "object") {
      const parsed = pickPair(item as Record<string, unknown>);
      if (parsed && parsed.name1 !== parsed.name2) out.push(parsed);
    }
  }

  if (!out.length) {
    throw new Error(
      '유효한 pairs 항목이 없습니다. { "pairs": [{ "userName1", "userName2" }] } 형태를 확인하세요.'
    );
  }

  return out;
}


