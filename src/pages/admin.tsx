import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { io, Socket } from "socket.io-client";
import { colors, fonts, CLOSE_FRIEND_OPTIONS } from "@/constants";
import {
  buildFullAiPrompt,
  buildParticipantRows,
  parseAiMatchPairsJson,
} from "@/lib/adminMatchingAi";

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

interface DraftPairRow {
  name1: string;
  name2: string;
}

const PRESET_POINTS = [20, 50, 100, 150, 200] as const;
const SCORE_SLOTS = 10;

let socket: Socket | null = null;

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlockedPin, setUnlockedPin] = useState("");
  const [tab, setTab] = useState<AdminTab>("game");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [selectedPresetPoints, setSelectedPresetPoints] = useState<number | null>(null);

  const [draftPairs, setDraftPairs] = useState<DraftPairRow[]>([]);
  const [aiPasteText, setAiPasteText] = useState("");
  const [matchBusy, setMatchBusy] = useState(false);

  const unmatchedUsers = useMemo(
    () => users.filter((user) => !user.friendId),
    [users]
  );

  const participantExportRows = useMemo(() => buildParticipantRows(users), [users]);

  const questionCategories = useMemo(
    () =>
      Array.from(new Set(questions.map((question) => question.category))).filter(Boolean),
    [questions]
  );

  /** 점수 랭킹·버튼 슬롯과 동일한 정렬 */
  const rankedFriends = useMemo(() => {
    return [...friends].sort((friendA, friendB) => {
      if (friendB.totalScore !== friendA.totalScore) {
        return friendB.totalScore - friendA.totalScore;
      }
      return friendA.name.localeCompare(friendB.name);
    });
  }, [friends]);

  const friendPickerSlots = useMemo(() => {
    const slice = rankedFriends.slice(0, SCORE_SLOTS);
    const slots: (FriendData | null)[] = [];
    for (let index = 0; index < SCORE_SLOTS; index += 1) {
      slots.push(slice[index] ?? null);
    }
    return slots;
  }, [rankedFriends]);

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

  const handleCopyAiPrompt = async () => {
    if (!participantExportRows.length) {
      alert("복사할 데이터가 없습니다. 짱칭 1·2·3순위가 모두 입력된 유저가 필요합니다.");
      return;
    }
    const promptText = buildFullAiPrompt(participantExportRows);
    try {
      await navigator.clipboard.writeText(promptText);
      alert("규칙 + 참가자 JSON 프롬프트를 클립보드에 복사했습니다.");
    } catch {
      alert("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  const handleApplyAiJsonToDraft = () => {
    try {
      const namePairs = parseAiMatchPairsJson(aiPasteText);
      setDraftPairs(
        namePairs.map((pairRow) => ({
          name1: pairRow.name1,
          name2: pairRow.name2,
        }))
      );
      alert(`프리뷰에 ${namePairs.length}개의 짝을 반영했습니다. 필요하면 수정 후 적용하세요.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "JSON을 해석하지 못했습니다.");
    }
  };

  const applyDraftPairs = async () => {
    if (!unlockedPin) return;
    const idByName = new Map(unmatchedUsers.map((userRow) => [userRow.name, userRow._id]));

    const sanitized: { userId1: string; userId2: string }[] = [];
    for (const pairRow of draftPairs) {
      const name1 = pairRow.name1.trim();
      const name2 = pairRow.name2.trim();
      if (!name1 || !name2 || name1 === name2) continue;
      const userId1 = idByName.get(name1);
      const userId2 = idByName.get(name2);
      if (!userId1 || !userId2) {
        alert(
          `'${name1}' 또는 '${name2}' 은(는) 현재 단짝 미배정 상태의 DB 유저 이름과 일치하지 않습니다. 새로고침 후 확인하세요.`
        );
        return;
      }
      sanitized.push({ userId1, userId2 });
    }

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
      setAiPasteText("");
      await fetchAdminData(unlockedPin);
      alert("적용했습니다.");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
    setMatchBusy(false);
  };

  const optionsForNameSelect = useCallback(
    (rowIdx: number, field: keyof DraftPairRow) => {
      const usedElsewhere = new Set<string>();
      draftPairs.forEach((row, idx) => {
        if (idx === rowIdx) return;
        if (row.name1) usedElsewhere.add(row.name1);
        if (row.name2) usedElsewhere.add(row.name2);
      });
      const current = draftPairs[rowIdx]?.[field];
      return [...CLOSE_FRIEND_OPTIONS].filter(
        (optionName) => !usedElsewhere.has(optionName) || optionName === current
      );
    },
    [draftPairs]
  );

  const handleGrantPresetScore = () => {
    if (!selectedPresetPoints || !selectedFriendId) {
      alert("부여 점수와 단짝을 먼저 선택해 주세요.");
      return;
    }
    const friend = friends.find((item) => item._id === selectedFriendId);
    if (!socket || !friend) {
      alert("소켓이 연결되지 않았거나 단짝을 찾지 못했습니다.");
      return;
    }
    const updateLog = `프리셋 ${selectedPresetPoints}점 부여`;
    socket.emit(
      "friend_score_update",
      friend._id,
      friend.name,
      updateLog,
      selectedPresetPoints
    );
  };

  const emitStart = () => socket?.emit("start_game");
  const emitReset = () => socket?.emit("reset_buzzer");
  const emitRoulette = () => socket?.emit("roulette_spin_request");
  const emitRouletteReset = () => {
    const ok = confirm(
      "모든 단짝을 룰렛 후보로 다시 넣습니다(roulette 보장). 진행중인 스핀은 중단됩니다. 계속할까요?"
    );
    if (!ok) return;
    socket?.emit("roulette_reset_request");
  };
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
            <Button type="button" onClick={emitRouletteReset}>
              룰렛 초기화
            </Button>
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

            <Title style={{ marginTop: 14, fontSize: 18 }}>AI 매칭 (프롬프트 복사)</Title>
            <SubLabel>
              아래 버튼으로 규칙 + 참가자 JSON 전체를 복사한 뒤 AI에 붙여넣습니다. 응답 JSON을 하단
              입력란에 넣고 「프리뷰에 반영」을 누르면 아래 짝 표가 채워집니다. 드롭다운 옵션은
              온보딩과 동일한 이름 풀({CLOSE_FRIEND_OPTIONS.length}명)입니다.
            </SubLabel>
            <Row wrap>
              <Button type="button" onClick={handleCopyAiPrompt}>
                규칙 + 데이터 프롬프트 복사
              </Button>
              <MetaLine style={{ flex: "1 1 100%" }}>
                내보내기 가능 인원: {participantExportRows.length}명 (짱칭 3명 모두 입력된 유저)
              </MetaLine>
            </Row>

            <JsonBlockLabel>AI 응답 JSON 붙여넣기</JsonBlockLabel>
            <JsonPasteArea
              rows={10}
              spellCheck={false}
              autoComplete="off"
              placeholder='예: { "pairs": [ { "userName1": "원정", "userName2": "은빈" } ] }'
              value={aiPasteText}
              onChange={(event) => setAiPasteText(event.target.value)}
            />
            <Row wrap>
              <Button type="button" onClick={handleApplyAiJsonToDraft}>
                프리뷰에 반영
              </Button>
            </Row>

            <MetaLine>
              단짝 미배정 유저 {unmatchedUsers.length}명 · 적용 시 이름이 DB display name과 정확히 같아야
              합니다.
            </MetaLine>

            <Title style={{ marginTop: 14, fontSize: 18 }}>적용 전 짝 (수동 수정 가능)</Title>
            {draftPairs.length === 0 ? (
              <EmptyHint>
                AI JSON을 「프리뷰에 반영」하거나 「짝 행 추가」로 편집을 시작하세요.
              </EmptyHint>
            ) : (
              <DraftList>
                {draftPairs.map((row, idx) => (
                  <DraftCard key={`${idx}-${row.name1}-${row.name2}`}>
                    <Select
                      aria-label={`짝 행 ${idx + 1} 첫 번째 이름`}
                      value={row.name1}
                      onChange={(event) =>
                        setDraftPairs((pairs) =>
                          pairs.map((item, cursor) =>
                            cursor === idx ? { ...item, name1: event.target.value } : item
                          )
                        )
                      }
                    >
                      <option value="">이름 선택</option>
                      {optionsForNameSelect(idx, "name1").map((optionName) => (
                        <option key={optionName} value={optionName}>
                          {optionName}
                        </option>
                      ))}
                    </Select>
                    <Muted>↔︎</Muted>
                    <Select
                      aria-label={`짝 행 ${idx + 1} 두 번째 이름`}
                      value={row.name2}
                      onChange={(event) =>
                        setDraftPairs((pairs) =>
                          pairs.map((item, cursor) =>
                            cursor === idx ? { ...item, name2: event.target.value } : item
                          )
                        )
                      }
                    >
                      <option value="">이름 선택</option>
                      {optionsForNameSelect(idx, "name2").map((optionName) => (
                        <option key={optionName} value={optionName}>
                          {optionName}
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
                      {(row.name1 || row.name2) && (
                        <PreviewHint>{`${row.name1 || "?"} ❤️ ${row.name2 || "?"}`}</PreviewHint>
                      )}
                    </SideStack>
                  </DraftCard>
                ))}
              </DraftList>
            )}

            <Row wrap>
              <Button
                type="button"
                onClick={() => setDraftPairs((rows) => [...rows, { name1: "", name2: "" }])}
              >
                짝 행 추가
              </Button>
              <Button onClick={applyDraftPairs} disabled={matchBusy}>
                선택한 짝 DB 적용
              </Button>
            </Row>
          </Section>
        </>
      )}

      {tab === "score" && (
        <ScoreTabGrow>
        <ScoreSection aria-label="점수 부여">
          <ScoreTitleRow>
            <Title style={{ margin: 0 }}>점수 부여</Title>
            <ScoreHintText>
              상위 {SCORE_SLOTS}팀 빠른 선택 · 랭킹 실시간 반영은 소켓 기준입니다
            </ScoreHintText>
          </ScoreTitleRow>

          <ScoreWorkbench>
            <RankColumn>
              <RankHeading>순위</RankHeading>
              <RankScroller>
                {rankedFriends.length === 0 ? (
                  <RankEmptyText>등록된 단짝이 없습니다.</RankEmptyText>
                ) : (
                  rankedFriends.map((friendRow, rankingIndex) => (
                    <RankRow key={friendRow._id}>
                      <RankBadge>{rankingIndex + 1}</RankBadge>
                      <RankName>{friendRow.name}</RankName>
                      <RankPoints>{friendRow.totalScore.toLocaleString("ko-KR")}점</RankPoints>
                    </RankRow>
                  ))
                )}
              </RankScroller>
            </RankColumn>

            <ControlColumn>
              <ControlHalf>
                <ControlLabel>부여 점수</ControlLabel>
                <PresetGrid>
                  {PRESET_POINTS.map((points) => (
                    <PresetButton
                      key={points}
                      type="button"
                      $active={selectedPresetPoints === points}
                      onClick={() =>
                        setSelectedPresetPoints((current) =>
                          current === points ? null : points
                        )
                      }
                    >
                      {points}점
                    </PresetButton>
                  ))}
                </PresetGrid>
              </ControlHalf>

              <ControlHalf>
                <ControlLabel>단짝 선택 (랭킹 상위 {SCORE_SLOTS}팀)</ControlLabel>
                <FriendSlotGrid>
                  {friendPickerSlots.map((slotFriend, slotIndex) => {
                    const isSelected =
                      Boolean(slotFriend) && selectedFriendId === slotFriend!._id;
                    return (
                      <FriendSlotButton
                        key={slotFriend?._id ?? `empty-${slotIndex}`}
                        type="button"
                        disabled={!slotFriend}
                        $active={isSelected}
                        onClick={() => {
                          if (!slotFriend) return;
                          setSelectedFriendId((current) =>
                            current === slotFriend._id ? "" : slotFriend._id
                          );
                        }}
                      >
                        <SlotIndex>{slotIndex + 1}</SlotIndex>
                        <SlotName>{slotFriend ? slotFriend.name : "—"}</SlotName>
                        {slotFriend ? (
                          <SlotScore>{slotFriend.totalScore.toLocaleString("ko-KR")}점</SlotScore>
                        ) : (
                          <SlotScore>빈 슬롯</SlotScore>
                        )}
                      </FriendSlotButton>
                    );
                  })}
                </FriendSlotGrid>
              </ControlHalf>

              <GrantRow>
                <GrantSummary>
                  {selectedPresetPoints ? (
                    <>
                      <strong>{selectedPresetPoints}점</strong>
                      {selectedFriendId
                        ? ` · ${
                            friends.find((item) => item._id === selectedFriendId)?.name ?? ""
                          }`
                        : " · 단짝 미선택"}
                    </>
                  ) : (
                    "점수를 선택해 주세요"
                  )}
                </GrantSummary>
                <GrantButton type="button" onClick={handleGrantPresetScore}>
                  점수 부여
                </GrantButton>
              </GrantRow>
            </ControlColumn>
          </ScoreWorkbench>
        </ScoreSection>
        </ScoreTabGrow>
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

const ScoreTabGrow = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

const MetaLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.grayscale.$07};
`;

const JsonBlockLabel = styled.label`
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  color: ${colors.secondary.black};
`;

const JsonPasteArea = styled.textarea`
  width: 100%;
  min-height: 160px;
  border-radius: 10px;
  border: 1px solid ${colors.grayscale.$09};
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.45;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${colors.primary.$01};
    box-shadow: 0 0 0 2px rgba(104, 80, 251, 0.2);
  }
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

const ScoreSection = styled.section`
  background: ${colors.secondary.white};
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
`;

const ScoreTitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ScoreHintText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${colors.grayscale.$07};
  font-family: ${fonts.pretendard.$400};
`;

const ScoreWorkbench = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: stretch;
    min-height: min(68vh, 720px);
  }
`;

const RankColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid ${colors.grayscale.$09};
  border-radius: 12px;
  padding: 12px;
  background: rgba(246, 248, 250, 0.45);

  @media (min-width: 768px) {
    flex: 0 0 33.333%;
    max-width: 33.333%;
  }
`;

const RankHeading = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${colors.secondary.black};
`;

const RankScroller = styled.div`
  flex: 1;
  overflow: auto;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const RankEmptyText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.grayscale.$07};
`;

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${colors.secondary.white};
  border: 1px solid rgba(228, 232, 235, 0.9);
  font-size: 13px;
  font-family: ${fonts.pretendard.$500};
`;

const RankBadge = styled.span`
  flex: 0 0 28px;
  text-align: center;
  font-family: ${fonts.pretendard.$700};
  font-size: 12px;
  color: ${colors.primary.$01};
`;

const RankName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RankPoints = styled.span`
  flex: 0 0 auto;
  font-family: ${fonts.pretendard.$600};
  color: ${colors.grayscale.$06};
`;

const ControlColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (min-width: 768px) {
    flex: 0 0 66.666%;
    max-width: 66.666%;
  }
`;

const ControlHalf = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid ${colors.grayscale.$09};
  border-radius: 12px;
  padding: 12px;
`;

const ControlLabel = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  color: ${colors.secondary.black};
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  flex: 1;
  align-content: start;
`;

const PresetButton = styled.button<{ $active: boolean }>`
  border-radius: 12px;
  border: 2px solid
    ${(props) => (props.$active ? colors.primary.$01 : colors.grayscale.$09)};
  background: ${(props) =>
    props.$active ? `${colors.secondary.$01}` : colors.secondary.white};
  color: ${colors.secondary.black};
  font-family: ${fonts.pretendard.$700};
  font-size: 16px;
  padding: 14px 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const FriendSlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  flex: 1;
  align-content: start;

  @media (min-width: 520px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
`;

const FriendSlotButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px;
  border-radius: 12px;
  border: 2px solid
    ${(props) =>
      props.$active ? colors.primary.$01 : "rgba(228, 232, 235, 0.95)"};
  background: ${(props) =>
    props.$active ? colors.secondary.$01 : colors.secondary.white};
  color: ${colors.secondary.black};
  font-family: ${fonts.pretendard.$500};
  text-align: left;
  cursor: pointer;
  min-height: 76px;

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
    background: rgba(246, 248, 250, 0.8);
  }
`;

const SlotIndex = styled.span`
  font-size: 11px;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.grayscale.$07};
`;

const SlotName = styled.span`
  font-size: 13px;
  font-family: ${fonts.pretendard.$600};
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SlotScore = styled.span`
  font-size: 11px;
  color: ${colors.grayscale.$07};
`;

const GrantRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
`;

const GrantSummary = styled.div`
  flex: 1;
  min-width: 160px;
  font-size: 14px;
  color: ${colors.grayscale.$07};
  font-family: ${fonts.pretendard.$500};

  strong {
    font-family: ${fonts.pretendard.$700};
    color: ${colors.secondary.black};
  }
`;

const GrantButton = styled.button`
  border: none;
  border-radius: 12px;
  min-height: 48px;
  padding: 0 28px;
  font-family: ${fonts.pretendard.$700};
  font-size: 16px;
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
  cursor: pointer;
  flex: 1 1 200px;

  &:active {
    transform: translateY(1px);
  }
`;
