import { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import Layout from "../components/layout/layout";
import { GiTrophyCup } from "react-icons/gi";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import StateMessage from "@/components/common/StateMessage";

interface FriendData {
  _id: string;
  name: string;
  totalScore: number;
}

interface FriendScoreHistory {
  updateLog: string;
  score: number;
  createdAt: string;
}

const ScorePage = () => {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [reason, setReason] = useState("");
  const [score, setScore] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [history, setHistory] = useState<FriendScoreHistory[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch("/api/socket").catch(() => {});
    const socketInstance = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    setSocket(socketInstance);

    socketInstance.on("friend_data", (data: FriendData[]) => {
      const sorted = [...data].sort((a, b) => b.totalScore - a.totalScore);
      setFriends(sorted.slice(0, 10));
      setLoadError("");
    });

    socketInstance.on("team_data", (data: FriendData[]) => {
      const sorted = [...data].sort((a, b) => b.totalScore - a.totalScore);
      setFriends(sorted.slice(0, 10));
      setLoadError("");
    });

    return () => {
      socketInstance.off("friend_data");
      socketInstance.off("team_data");
      socketInstance.disconnect();
    };
  }, []);

  const openHistory = async (friend: FriendData) => {
    try {
      const response = await fetch(`/api/friend-scores?friendId=${friend._id}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = (await response.json()) as FriendScoreHistory[];
      setSelectedFriend(friend);
      setHistory(data);
    } catch (error) {
      console.error("Friend history fetch error:", error);
      setLoadError("점수 기록을 불러오지 못했어요.");
    }
  };

  const handleScoreUpdate = () => {
    if (!session?.user?.role || session.user.role !== "admin") return;
    if (!selectedFriend || !reason.trim() || !score || !socket) return;

    socket.emit(
      "friend_score_update",
      selectedFriend._id,
      selectedFriend.name,
      reason.trim(),
      Number(score)
    );

    setReason("");
    setScore("");
  };

  return (
    <AllContainer>
      <Container>
        <TitleRow>
          <Title>단짝 스코어</Title>
          <SubTitle>TOP 10</SubTitle>
        </TitleRow>

        <ListContainer>
          {loadError ? (
            <StateMessage title="문제가 발생했어요" description={loadError} />
          ) : null}
          {!friends.length && !loadError ? (
            <StateMessage title="아직 점수 데이터가 없어요" description="단짝 점수가 생성되면 여기에 표시됩니다." />
          ) : null}
          {friends.map((friend, index) => (
            <FriendRow key={friend._id} onClick={() => openHistory(friend)}>
              <LeftBox>
                {index < 3 ? (
                  <GiTrophyCup
                    size={24}
                    color={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32"}
                  />
                ) : (
                  <RankText>{index + 1}</RankText>
                )}
                <FriendName>{friend.name}</FriendName>
              </LeftBox>
              <ScoreText>{friend.totalScore}</ScoreText>
            </FriendRow>
          ))}
        </ListContainer>
      </Container>

      {selectedFriend && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{selectedFriend.name} 점수 기록</ModalTitle>
              <CloseButton
                onClick={() => {
                  setSelectedFriend(null);
                  setHistory([]);
                }}
              >
                ×
              </CloseButton>
            </ModalHeader>

            {session?.user?.role === "admin" && (
              <ScoreUpdateForm>
                <ReasonInput
                  placeholder="점수 사유"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <ScoreInput
                  type="number"
                  placeholder="점수"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                />
                <AddButton
                  $isActive={Boolean(reason.trim()) && Boolean(score)}
                  onClick={handleScoreUpdate}
                  disabled={!reason.trim() || !score}
                >
                  반영
                </AddButton>
              </ScoreUpdateForm>
            )}

            <HistoryList>
              {history.map((item, index) => (
                <HistoryItem key={`${item.createdAt}-${index}`}>
                  <HistoryLog>{item.updateLog}</HistoryLog>
                  <HistoryScore>
                    {item.score > 0 ? `+${item.score}` : item.score}
                  </HistoryScore>
                </HistoryItem>
              ))}
            </HistoryList>
          </ModalContent>
        </Modal>
      )}
    </AllContainer>
  );
};

const AllContainer = styled.div`
  padding: 36px 16px 120px;
`;

const Container = styled.div`
  border-radius: 20px;
  background: ${colors.secondary.white};
  padding: 18px;
  box-shadow: 0 12px 26px rgba(25, 25, 25, 0.14);
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${fonts.pretendard.$700};
  font-size: 24px;
  color: ${colors.secondary.black};
`;

const SubTitle = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$06};
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FriendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${colors.grayscale.$10};
  border-radius: 14px;
  padding: 14px 12px;
  cursor: pointer;
`;

const LeftBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RankText = styled.div`
  width: 24px;
  text-align: center;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
`;

const FriendName = styled.div`
  font-family: ${fonts.pretendard.$600};
  color: ${colors.secondary.black};
`;

const ScoreText = styled.div`
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 22px;
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
`;

const ModalContent = styled.div`
  width: min(560px, calc(100% - 24px));
  max-height: 80vh;
  overflow: auto;
  background: ${colors.secondary.white};
  border-radius: 18px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${colors.grayscale.$09};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-family: ${fonts.pretendard.$700};
  font-size: 20px;
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
`;

const ScoreUpdateForm = styled.div`
  display: flex;
  gap: 8px;
  padding: 14px 16px;
`;

const ReasonInput = styled.input`
  flex: 1;
  border: 1px solid ${colors.grayscale.$08};
  border-radius: 10px;
  height: 42px;
  padding: 0 10px;
`;

const ScoreInput = styled.input`
  width: 88px;
  border: 1px solid ${colors.grayscale.$08};
  border-radius: 10px;
  height: 42px;
  padding: 0 10px;
`;

const AddButton = styled.button<{ $isActive: boolean }>`
  border: none;
  border-radius: 10px;
  padding: 0 14px;
  font-family: ${fonts.pretendard.$600};
  background: ${(props) => (props.$isActive ? colors.primary.$01 : colors.grayscale.$08)};
  color: ${colors.secondary.white};
  cursor: ${(props) => (props.$isActive ? "pointer" : "not-allowed")};
`;

const HistoryList = styled.div`
  padding: 0 16px 16px;
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${colors.grayscale.$09};
`;

const HistoryLog = styled.div`
  color: ${colors.secondary.black};
`;

const HistoryScore = styled.div`
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
`;

ScorePage.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default ScorePage;
