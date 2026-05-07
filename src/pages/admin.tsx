import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { io, Socket } from "socket.io-client";
import { colors, fonts } from "@/constants";

type AdminTab = "game" | "match" | "score";

interface AdminUser {
  _id: string;
  name: string;
  friendId?: string | null;
  closeFriends?: string[];
  onboardingCompleted?: boolean;
}

interface FriendData {
  _id: string;
  name: string;
  totalScore: number;
}

interface Question {
  _id: string;
  category: string;
  number: number;
  text: string;
}

interface PreviewPairRow {
  userId1: string;
  userId2: string;
  userName1: string;
  userName2: string;
  displayName: string;
  rank1To2: number;
  rank2To1: number;
  preferenceSum: number;
  mutualFirst: boolean;
}

interface DraftPairRow {
  userId1: string;
  userId2: string;
}

let socket: Socket | null = null;

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlockedPin, setUnlockedPin] = useState("");
  const [tab, setTab] = useState<AdminTab>("game");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [scoreReason, setScoreReason] = useState("");
  const [scoreValue, setScoreValue] = useState("");

  const [draftPairs, setDraftPairs] = useState<DraftPairRow[]>([]);
  const [previewMeta, setPreviewMeta] = useState<{
    unmatchedUserIds: string[];
    algorithmSummary?: {
      candidateCount: number;
      proposedPairCount: number;
      remainingUnmatched: number;
    };
    notes: string[];
  } | null>(null);
  const [matchBusy, setMatchBusy] = useState(false);

  const unmatchedUsers = useMemo(
    () => users.filter((user) => !user.friendId),
    [users]
  );

  const questionCategories = useMemo(
    () =>
      Array.from(new Set(questions.map((question) => question.category))).filter(Boolean),
    [questions]
  );

  const fetchAdminData = useCallback(async (targetPin: string) => {
    const headers = { "x-admin-pin": targetPin };
    const [matchRes, friendsRes, questionsRes] = await Promise.all([
      fetch("/api/admin/match", { headers }),
      fetch("/api/friends"),
      fetch("/api/questions"),
    ]);
    if (!matchRes.ok) throw new Error("관리자 인증 실패");
    const matchData = await matchRes.json();
    const friendData = await friendsRes.json();
    const questionData = await questionsRes.json();
    setUsers(matchData.users ?? []);
    setFriends(friendData.friends ?? []);
    setQuestions(questionData.questions ?? []);
  }, []);

  useEffect(() => {
    if (!unlockedPin) return;
    fetchAdminData(unlockedPin).catch((error) => {
      console.error(error);
      setUnlockedPin("");
    });

    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
        auth: { adminPin: unlockedPin },
      });
    }

    socket.on("friend_data", (data: FriendData[]) => setFriends(data));
    return () => {
      socket?.off("friend_data");
    };
  }, [fetchAdminData, unlockedPin]);

  const handleUnlock = async () => {
    try {
      await fetchAdminData(pin);
      setUnlockedPin(pin);
      setPin("");
    } catch {
      alert("PIN이 올바르지 않습니다.");
    }
  };

  const handleRefreshMatching = async () => {
    if (!unlockedPin) return;
    try {
      await fetchAdminData(unlockedPin);
    } catch {
      alert("새로고침 실패");
    }
  };

  const runMatchingPreview = async () => {
    if (!unlockedPin) return;
    setMatchBusy(true);
    try {
      const response = await fetch("/api/admin/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": unlockedPin,
        },
        body: JSON.stringify({ mode: "preview" }),
      });
      if (!response.ok) {
        alert("매칭안 생성 실패");
        setMatchBusy(false);
        return;
      }
      const data = await response.json();
      const preview = (data.preview ?? []) as PreviewPairRow[];
      setDraftPairs(
        preview.map((row) => ({ userId1: row.userId1, userId2: row.userId2 }))
      );
      setPreviewMeta({
        unmatchedUserIds: data.unmatchedUserIds ?? [],
        algorithmSummary: data.algorithmSummary,
        notes: data.notes ?? [],
      });
    } catch {
      alert("네트워크 오류로 매칭안을 불러오지 못했습니다.");
    }
    setMatchBusy(false);
  };

  const applyDraftPairs = async () => {
    if (!unlockedPin) return;
    const sanitized = draftPairs.filter(
      (pair) =>
        pair.userId1 !== "" &&
        pair.userId2 !== "" &&
        pair.userId1 !== pair.userId2
    );
    if (!sanitized.length) {
      alert("적용할 유효한 짝이 없습니다.");
      return;
    }
    const seen = new Set<string>();
    for (const pair of sanitized) {
      if (seen.has(pair.userId1) || seen.has(pair.userId2)) {
        alert("짝 수정 화면에서 동일 유저 중복 선택이 있습니다.");
        return;
      }
      seen.add(pair.userId1);
      seen.add(pair.userId2);
    }
    const ok = confirm(
      `${sanitized.length}개의 단짝을 즉시 DB에 적용합니다. 진행할까요?`
    );
    if (!ok) return;
    setMatchBusy(true);
    try {
      const response = await fetch("/api/admin/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": unlockedPin,
        },
        body: JSON.stringify({ mode: "apply", pairs: sanitized }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body?.error ?? "적용 실패");
        setMatchBusy(false);
        return;
      }
      setDraftPairs([]);
      setPreviewMeta(null);
      await fetchAdminData(unlockedPin);
      alert("적용했습니다.");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
    setMatchBusy(false);
  };

  const userMap = useMemo(() => new Map(users.map((user) => [user._id, user])), [users]);

  const optionsForSelect = useCallback(
    (rowIdx: number, field: keyof DraftPairRow) => {
      const usedElsewhere = new Set<string>();
      draftPairs.forEach((row, idx) => {
        if (idx === rowIdx) return;
        if (row.userId1) usedElsewhere.add(row.userId1);
        if (row.userId2) usedElsewhere.add(row.userId2);
      });
      const current = draftPairs[rowIdx]?.[field];
      const base = unmatchedUsers.filter(
        (user) =>
          user._id && (!usedElsewhere.has(user._id) || user._id === current)
      );
      return base.sort((first, second) => first.name.localeCompare(second.name));
    },
    [draftPairs, unmatchedUsers]
  );

  const emitScore = () => {
    const friend = friends.find((item) => item._id === selectedFriendId);
    if (!socket || !friend || !scoreReason.trim() || !scoreValue) return;
    socket.emit(
      "friend_score_update",
      friend._id,
      friend.name,
      scoreReason.trim(),
      Number(scoreValue)
    );
    setScoreReason("");
    setScoreValue("");
  };

  const emitStart = () => socket?.emit("start_game");
  const emitReset = () => socket?.emit("reset_buzzer");
  const emitRoulette = () => socket?.emit("roulette_spin_request");
  const emitQuestionCategory = (category: string) =>
    socket?.emit("question_select_category", category);
  const emitPrev = () => socket?.emit("question_prev");
  const emitNext = () => socket?.emit("question_next");

  if (!unlockedPin) {
    return (
      <Page>
        <Card>
          <Title>관리자 페이지</Title>
          <Input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="4자리 PIN"
          />
          <Button onClick={handleUnlock} disabled={pin.length !== 4}>
            입장
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <TabBar aria-label="관리 탭">
        <TabButton
          type="button"
          aria-selected={tab === "game"}
          $active={tab === "game"}
          onClick={() => setTab("game")}
        >
          게임 진행
        </TabButton>
        <TabButton
          type="button"
          aria-selected={tab === "match"}
          $active={tab === "match"}
          onClick={() => setTab("match")}
        >
          짱칭 매칭
        </TabButton>
        <TabButton
          type="button"
          aria-selected={tab === "score"}
          $active={tab === "score"}
          onClick={() => setTab("score")}
        >
          점수 부여
        </TabButton>
      </TabBar>

      {tab === "game" && (
        <Section>
          <Title>게임 진행</Title>
          <Row>
            <Button onClick={emitStart}>버저 시작</Button>
            <Button onClick={emitReset}>버저 리셋</Button>
            <Button onClick={emitRoulette}>룰렛 실행</Button>
          </Row>
          <Row>
            {questionCategories.map((category) => (
              <Button key={category} onClick={() => emitQuestionCategory(category)}>
                {category}
              </Button>
            ))}
          </Row>
          <Row>
            <Button onClick={emitPrev}>문제 이전</Button>
            <Button onClick={emitNext}>문제 다음</Button>
          </Row>
        </Section>
      )}

      {tab === "match" && (
        <>
          <Section>
            <TopRow>
              <Title style={{ flex: 1 }}>짱칭 매칭</Title>
              <Button type="button" onClick={handleRefreshMatching}>
                새로고침
              </Button>
            </TopRow>
            <SubLabel>각 유저의 짱칭(선호) 목록 및 단짝 배정 상태</SubLabel>

            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>이름</Th>
                    <Th>1순위</Th>
                    <Th>2순위</Th>
                    <Th>3순위</Th>
                    <Th>온보딩</Th>
                    <Th>단짝</Th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const prefers = Array.isArray(user.closeFriends)
                      ? [...user.closeFriends]
                      : [];
                    while (prefers.length < 3) prefers.push("—");
                    return (
                      <tr key={user._id}>
                        <Td>{user.name}</Td>
                        <Td>{prefers[0] || "—"}</Td>
                        <Td>{prefers[1] || "—"}</Td>
                        <Td>{prefers[2] || "—"}</Td>
                        <Td>{user.onboardingCompleted ? "완료" : "미완료"}</Td>
                        <Td>{user.friendId ? "배정됨" : "대기중"}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableScroll>

            {previewMeta?.notes?.length ? (
              <Bullets>
                {previewMeta.notes.map((note) => (
                  <Bullet key={note}>{note}</Bullet>
                ))}
              </Bullets>
            ) : null}

            <Row wrap>
              <Button onClick={runMatchingPreview} disabled={matchBusy || !unmatchedUsers.length}>
                매칭안 만들기
              </Button>
              <Button onClick={() => setDraftPairs((rows) => [...rows, { userId1: "", userId2: "" }])}>
                짝 행 추가
              </Button>
            </Row>

            {previewMeta?.algorithmSummary ? (
              <MetaLine>
                후보 미배정 {previewMeta.algorithmSummary.candidateCount}명 · 제안{" "}
                {previewMeta.algorithmSummary.proposedPairCount}개 · 매칭 제외 미배정{" "}
                {previewMeta.algorithmSummary.remainingUnmatched}명
              </MetaLine>
            ) : (
              <MetaLine>
                미배정 유저{" "}
                {unmatchedUsers.length}명
              </MetaLine>
            )}

            <Title style={{ marginTop: 14, fontSize: 18 }}>적용 전 짝 (수동 수정 가능)</Title>
            {draftPairs.length === 0 ? (
              <EmptyHint>먼저 &quot;매칭안 만들기&quot; 또는 &quot;짝 행 추가&quot; 버튼을 눌러주세요.</EmptyHint>
            ) : (
              <DraftList>
                {draftPairs.map((row, idx) => {
                  const user1Label = row.userId1 ? userMap.get(row.userId1)?.name : "";
                  const user2Label = row.userId2 ? userMap.get(row.userId2)?.name : "";
                  return (
                    <DraftCard key={`${idx}-${row.userId1}-${row.userId2}`}>
                      <Select
                        aria-label={`짝 행 ${idx + 1} 첫 번째 유저`}
                        value={row.userId1}
                        onChange={(event) =>
                          setDraftPairs((pairs) =>
                            pairs.map((item, cursor) =>
                              cursor === idx ? { ...item, userId1: event.target.value } : item
                            )
                          )
                        }
                      >
                        <option value="">유저 선택</option>
                        {optionsForSelect(idx, "userId1").map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name}
                          </option>
                        ))}
                      </Select>
                      <Muted>↔︎</Muted>
                      <Select
                        aria-label={`짝 행 ${idx + 1} 두 번째 유저`}
                        value={row.userId2}
                        onChange={(event) =>
                          setDraftPairs((pairs) =>
                            pairs.map((item, cursor) =>
                              cursor === idx ? { ...item, userId2: event.target.value } : item
                            )
                          )
                        }
                      >
                        <option value="">유저 선택</option>
                        {optionsForSelect(idx, "userId2").map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name}
                          </option>
                        ))}
                      </Select>
                      <SideStack>
                        <MiniButton
                          type="button"
                          onClick={() =>
                            setDraftPairs((pairs) =>
                              pairs.filter((_, removalIdx) => removalIdx !== idx)
                            )
                          }
                        >
                          삭제
                        </MiniButton>
                        {(user1Label || user2Label) && (
                          <PreviewHint>{`${user1Label || "?"} ❤️ ${user2Label || "?"}`}</PreviewHint>
                        )}
                      </SideStack>
                    </DraftCard>
                  );
                })}
              </DraftList>
            )}

            <Row wrap>
              <Button onClick={applyDraftPairs} disabled={matchBusy}>
                선택한 짝 DB 적용
              </Button>
            </Row>
          </Section>
        </>
      )}

      {tab === "score" && (
        <Section>
          <Title>점수 부여</Title>
          <Select
            value={selectedFriendId}
            onChange={(event) => setSelectedFriendId(event.target.value)}
          >
            <option value="">단짝 선택</option>
            {friends.map((friend) => (
              <option key={friend._id} value={friend._id}>
                {friend.name}
              </option>
            ))}
          </Select>
          <Row>
            <Input
              value={scoreReason}
              onChange={(event) => setScoreReason(event.target.value)}
              placeholder="점수 사유"
            />
            <Input
              type="number"
              value={scoreValue}
              onChange={(event) => setScoreValue(event.target.value)}
              placeholder="점수"
            />
          </Row>
          <Button onClick={emitScore}>점수 반영</Button>
        </Section>
      )}
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  background: ${colors.secondary.$01};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TabBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  background: ${(props) =>
    props.$active ? colors.secondary.white : "rgba(255, 255, 255, 0.72)"};
  color: ${colors.secondary.black};
  box-shadow: ${(props) =>
    props.$active ? "0 8px 18px rgba(25,25,25,0.09)" : "none"};
`;

const Section = styled.div`
  background: ${colors.secondary.white};
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled(Section)`
  max-width: 420px;
  margin: 80px auto 0;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 20px;
`;

const SubLabel = styled.p`
  margin: 0;
  font-family: ${fonts.pretendard.$400};
  color: ${colors.grayscale.$07};
  font-size: 14px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  & ${Title} {
    margin-bottom: 0;
  }
`;

const Row = styled.div<{ wrap?: boolean }>`
  display: flex;
  flex-wrap: ${(props) => (props.wrap ? "wrap" : "nowrap")};
  gap: 8px;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  height: 42px;
  border-radius: 10px;
  border: 1px solid ${colors.grayscale.$09};
  padding: 0 10px;
  font-family: ${fonts.pretendard.$500};
`;

const Select = styled.select`
  width: 100%;
  height: 42px;
  border-radius: 10px;
  border: 1px solid ${colors.grayscale.$09};
  padding: 0 10px;
  font-family: ${fonts.pretendard.$500};
  background: ${colors.secondary.white};
`;

const Button = styled.button`
  border: none;
  border-radius: 10px;
  height: 42px;
  padding: 0 14px;
  font-family: ${fonts.pretendard.$600};
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MiniButton = styled.button`
  border: none;
  border-radius: 8px;
  height: 36px;
  padding: 0 10px;
  font-family: ${fonts.pretendard.$600};
  font-size: 12px;
  background: rgba(245, 75, 100, 0.12);
  color: rgb(245, 75, 100);
  cursor: pointer;
`;

const TableScroll = styled.div`
  width: 100%;
  overflow: auto;
  border: 1px solid ${colors.grayscale.$09};
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${fonts.pretendard.$400};
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 8px;
  background: rgba(246, 248, 250, 0.9);
  border-bottom: 1px solid ${colors.grayscale.$09};
`;

const Td = styled.td`
  padding: 10px 8px;
  border-bottom: 1px solid ${colors.grayscale.$09};
  white-space: nowrap;
`;

const Bullets = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: ${colors.grayscale.$07};
  font-size: 13px;
`;

const Bullet = styled.li`
  margin-bottom: 6px;
`;

const MetaLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.grayscale.$07};
`;

const EmptyHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.grayscale.$07};
`;

const DraftList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DraftCard = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(228, 232, 235, 0.9);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Muted = styled.span`
  text-align: center;
  font-size: 12px;
  color: ${colors.grayscale.$07};
`;

const SideStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;

  @media (max-width: 720px) {
    grid-column: span 4;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }
`;

const PreviewHint = styled.span`
  font-size: 12px;
  color: ${colors.grayscale.$06};
`;
