import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { io, Socket } from "socket.io-client";
import { colors, fonts } from "@/constants";

interface AdminUser {
  _id: string;
  name: string;
  friendId?: string | null;
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

let socket: Socket | null = null;

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlockedPin, setUnlockedPin] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leftUserId, setLeftUserId] = useState("");
  const [rightUserId, setRightUserId] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [scoreReason, setScoreReason] = useState("");
  const [scoreValue, setScoreValue] = useState("");

  const unmatchedUsers = useMemo(
    () => users.filter((user) => !user.friendId),
    [users]
  );

  const questionCategories = useMemo(
    () => Array.from(new Set(questions.map((question) => question.category))).filter(Boolean),
    [questions]
  );

  const fetchAdminData = async (targetPin: string) => {
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
  };

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
  }, [unlockedPin]);

  const handleUnlock = async () => {
    try {
      await fetchAdminData(pin);
      setUnlockedPin(pin);
      setPin("");
    } catch {
      alert("PIN이 올바르지 않습니다.");
    }
  };

  const createManualMatch = async () => {
    if (!leftUserId || !rightUserId) return;
    const response = await fetch("/api/admin/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": unlockedPin,
      },
      body: JSON.stringify({ mode: "manual", userId1: leftUserId, userId2: rightUserId }),
    });
    if (!response.ok) {
      alert("매칭 실패");
      return;
    }
    await fetchAdminData(unlockedPin);
  };

  const createAutoMatch = async () => {
    const response = await fetch("/api/admin/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": unlockedPin,
      },
      body: JSON.stringify({ mode: "auto" }),
    });
    if (!response.ok) {
      alert("자동 매칭 실패");
      return;
    }
    await fetchAdminData(unlockedPin);
  };

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

      <Section>
        <Title>단짝 매칭</Title>
        <Row>
          <Select value={leftUserId} onChange={(event) => setLeftUserId(event.target.value)}>
            <option value="">유저 선택</option>
            {unmatchedUsers.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </Select>
          <Select value={rightUserId} onChange={(event) => setRightUserId(event.target.value)}>
            <option value="">유저 선택</option>
            {unmatchedUsers.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </Select>
        </Row>
        <Row>
          <Button onClick={createManualMatch}>수동 매칭</Button>
          <Button onClick={createAutoMatch}>자동 매칭</Button>
        </Row>
      </Section>

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
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  background: ${colors.secondary.$01};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Section = styled.div`
  background: ${colors.secondary.white};
  border-radius: 16px;
  padding: 16px;
`;

const Card = styled(Section)`
  max-width: 420px;
  margin: 80px auto 0;
`;

const Title = styled.h1`
  margin: 0 0 12px;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 20px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
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
