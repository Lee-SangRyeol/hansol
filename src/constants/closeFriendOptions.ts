/** 온보딩 「짱칭 3명」(드롭다운 풀) — DB 시드와 이름이 일치해야 합니다. */
export const CLOSE_FRIEND_OPTIONS = [
  "원정",
  "은빈",
  "유미",
  "소연",
  "서영",
  "원태",
  "상렬",
  "하은",
  "지인",
  "성호",
  "준태",
  "련아",
  "희원",
  "민수",
  "도영",
  "충현",
  "가현",
  "재인",
  "수현",
  "소현",
] as const;

export type CloseFriendName = (typeof CLOSE_FRIEND_OPTIONS)[number];
