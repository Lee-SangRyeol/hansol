import { ReactElement, useState, useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import Layout from "../components/layout/layout";
import { GiTrophyCup } from "react-icons/gi";
import { io } from "socket.io-client";
import { RxEnter } from "react-icons/rx";
import { useSession } from "next-auth/react";
import React from "react";

interface TeamData {
  name: string;
  totalScore: number;
}

interface UserData {
  name: string;
  score: number;
}

interface TeamScoreHistory {
  updateLog: string;
  score: number;
  createdAt: string;
}

interface SoloScoreHistory {
  updateLog: string;
  score: number;
  createdAt: string;
}

const ScoreAdmin = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"team" | "solo">("team");
  const [teamData, setTeamData] = useState<TeamData[]>([]);
  const [userData, setUserData] = useState<UserData[]>([]);
  const [reasons, setReasons] = useState<string[]>(["", "", ""]);
  const [scores, setScores] = useState<string[]>(["", "", ""]);
  const [socket, setSocket] = useState<any>(null);
  const [soloReasons, setSoloReasons] = useState<string[]>([]);
  const [soloScores, setSoloScores] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeamHistory, setSelectedTeamHistory] = useState<
    TeamScoreHistory[]
  >([]);
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedUserHistory, setSelectedUserHistory] = useState<
    SoloScoreHistory[]
  >([]);
  const [selectedUserName, setSelectedUserName] = useState("");

  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket",
    });

    setSocket(socketInstance);

    socketInstance.on("team_data", (teams: TeamData[]) => {
      const sortedTeams = teams.sort((a, b) => b.totalScore - a.totalScore);
      setTeamData(sortedTeams);
    });

    socketInstance.on("user_data", (users: UserData[]) => {
      const sortedUsers = users.sort((a, b) => b.score - a.score);
      setUserData(sortedUsers);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleScoreUpdate = (index: number) => {
    if (!reasons[index] || !scores[index]) return;

    socket.emit(
      "team_score_update",
      teamData[index]?.name,
      reasons[index],
      Number(scores[index])
    );

    // 입력 필드 초기화
    const newReasons = [...reasons];
    const newScores = [...scores];
    newReasons[index] = "";
    newScores[index] = "";
    setReasons(newReasons);
    setScores(newScores);
  };

  const handleSoloScoreUpdate = (index: number) => {
    if (!soloReasons[index] || !soloScores[index]) return;

    socket.emit(
      "solo_score_update",
      userData[index]?.name,
      soloReasons[index],
      Number(soloScores[index])
    );

    // 입력 필드 초기화
    const newReasons = [...soloReasons];
    const newScores = [...soloScores];
    newReasons[index] = "";
    newScores[index] = "";
    setSoloReasons(newReasons);
    setSoloScores(newScores);
  };

  const handleTeamClick = async (teamName: string | undefined) => {
    if (!teamName) return;

    try {
      const response = await fetch(`/api/teamScore?name=${teamName}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setSelectedTeamHistory(data);
      setSelectedTeamName(teamName);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Team history fetch error:", error);
    }
  };

  const handleUserClick = async (userName: string) => {
    try {
      const response = await fetch(`/api/scores?name=${userName}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setSelectedUserHistory(data);
      setSelectedUserName(userName);
      setIsModalOpen(true);
    } catch (error) {
      console.error("User history fetch error:", error);
    }
  };

  return (
    <AllContainer>
      <Container>
        <TabContainer>
          <TabButton
            isActive={activeTab === "team"}
            onClick={() => setActiveTab("team")}
          >
            TEAM
          </TabButton>
          <TabButton
            isActive={activeTab === "solo"}
            onClick={() => setActiveTab("solo")}
          >
            SOLO
          </TabButton>
        </TabContainer>
        <ContentContainer>
          {activeTab === "team" ? (
            <TeamScoreContainer>
              {[0, 1, 2].map((index) => (
                <React.Fragment key={index}>
                  <RankSection
                    onClick={() =>
                      teamData[index]?.name &&
                      handleTeamClick(teamData[index].name)
                    }
                  >
                    <IconWrapper>
                      <GiTrophyCup
                        size={index === 0 ? 40 : 32}
                        color={
                          index === 0
                            ? "#FFD700"
                            : index === 1
                            ? "#C0C0C0"
                            : "#CD7F32"
                        }
                      />
                    </IconWrapper>
                    <TeamName>{teamData[index]?.name || "-"}</TeamName>
                    <ScoreText>{teamData[index]?.totalScore || 0}</ScoreText>
                  </RankSection>
                  {session?.user?.role === "admin" && (
                    <ScoreUpdateForm>
                      <ReasonInput
                        placeholder="점수 추가 사유"
                        value={reasons[index]}
                        onChange={(e: { target: { value: string } }) => {
                          const newReasons = [...reasons];
                          newReasons[index] = e.target.value;
                          setReasons(newReasons);
                        }}
                      />
                      <ScoreInput
                        type="number"
                        placeholder="점수"
                        value={scores[index]}
                        onChange={(e: { target: { value: string } }) => {
                          const newScores = [...scores];
                          newScores[index] = e.target.value;
                          setScores(newScores);
                        }}
                      />
                      <AddButton
                        disabled={!reasons[index] || !scores[index]}
                        onClick={() => handleScoreUpdate(index)}
                        $isActive={!!reasons[index] && !!scores[index]}
                      >
                        Done
                      </AddButton>
                    </ScoreUpdateForm>
                  )}
                  {index < 2 && <Divider />}
                </React.Fragment>
              ))}
            </TeamScoreContainer>
          ) : (
            <SoloScoreContainer>
              {userData.map((user, index) => (
                <React.Fragment key={user.name}>
                  <ScoreRow
                    rank={index + 1}
                    onClick={() => handleUserClick(user.name)}
                    style={{ cursor: "pointer" }}
                  >
                    <RankInfo>
                      {index < 3 ? (
                        <IconWrapper>
                          <GiTrophyCup
                            size={index === 0 ? 28 : 24}
                            color={
                              index === 0
                                ? "#FFD700"
                                : index === 1
                                ? "#C0C0C0"
                                : "#CD7F32"
                            }
                          />
                        </IconWrapper>
                      ) : (
                        <RankNumber>{index + 1}</RankNumber>
                      )}
                    </RankInfo>
                    <UserName>{user.name}</UserName>
                    <UserScore>{user.score}</UserScore>
                  </ScoreRow>
                  {session?.user?.role === "admin" && (
                    <ScoreUpdateForm>
                      <ReasonInput
                        placeholder="점수 추가 사유"
                        value={soloReasons[index] || ""}
                        onChange={(e: { target: { value: string } }) => {
                          const newReasons = [...soloReasons];
                          newReasons[index] = e.target.value;
                          setSoloReasons(newReasons);
                        }}
                      />
                      <ScoreInput
                        type="number"
                        placeholder="점수"
                        value={soloScores[index] || ""}
                        onChange={(e: { target: { value: string } }) => {
                          const newScores = [...soloScores];
                          newScores[index] = e.target.value;
                          setSoloScores(newScores);
                        }}
                      />
                      <AddButton
                        disabled={!soloReasons[index] || !soloScores[index]}
                        onClick={() => handleSoloScoreUpdate(index)}
                        $isActive={!!soloReasons[index] && !!soloScores[index]}
                      >
                        Done
                      </AddButton>
                    </ScoreUpdateForm>
                  )}
                  {index < userData.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </SoloScoreContainer>
          )}
        </ContentContainer>
      </Container>

      {isModalOpen && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {selectedTeamName || selectedUserName} 점수 기록
              </ModalTitle>
              <CloseButton
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedTeamName("");
                  setSelectedUserName("");
                }}
              >
                ×
              </CloseButton>
            </ModalHeader>
            <HistoryList>
              {(selectedTeamHistory.length > 0
                ? selectedTeamHistory
                : selectedUserHistory
              ).map((history, index) => (
                <HistoryItem key={index}>
                  <HistoryLog>{history.updateLog}</HistoryLog>
                  <HistoryScore>
                    {history.score > 0 ? `+${history.score}` : history.score}
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

const TabContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100px;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: ${colors.grayscale.$04};
  }
`;

const TabButton = styled.button<{ isActive: boolean }>`
  width: 50%;
  height: 100%;
  border: none;
  background-color: transparent;
  color: ${(props) =>
    props.isActive ? colors.grayscale.$11 : colors.grayscale.$07};
  font-family: ${fonts.pretendard.$700};
  font-size: 28px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: ${(props) =>
      props.isActive ? colors.grayscale.$11 : "transparent"};
    transition: all 0.3s ease;
  }

  &:hover {
    color: ${colors.grayscale.$11};
  }

  &:first-child {
    border-top-left-radius: 16px;
  }

  &:last-child {
    border-top-right-radius: 16px;
  }
`;

const ContentContainer = styled.div`
  height: calc(100% - 100px);
  width: 100%;
  font-family: ${fonts.pretendard.$700};
  padding: 32px;
  background-color: ${colors.grayscale.$02};
  transition: all 0.3s ease;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const AllContainer = styled.div`
  padding: 50px 16px 150px 16px;
`;

const Container = styled.div`
  height: 75vh;
  background-color: ${colors.grayscale.$02};
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
`;

const TeamScoreContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 20px;
  height: 90%;

  & > div:first-child {
    margin-top: auto;
  }

  & > div:last-child {
    margin-bottom: auto;
  }
`;

const RankSection = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 32px;
  background-color: ${colors.grayscale.$01};
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  min-width: 300px;
  &:active {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 16px;
`;

const TeamName = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 24px;
  color: ${colors.grayscale.$11};
  flex: 1;
`;

const ScoreText = styled.span`
  font-family: ${fonts.pretendard.$700};
  font-size: 30px;
  color: ${colors.grayscale.$11};
  margin-left: 16px;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  border: 1px dashed ${colors.grayscale.$04};
`;

const AdminButton = styled.a`
  position: absolute;
  bottom: 14%;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #ffffff;
  font-size: 24px;
  font-weight: bold;
  text-decoration: none;
  color: ${colors.grayscale.$11};
  background: linear-gradient(
    145deg,
    ${colors.grayscale.$02},
    ${colors.grayscale.$03}
  );
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 20px;
  }
`;

const SoloScoreContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding-top: 5px;
  height: 90%;
  overflow-y: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ScoreRow = styled.div<{ rank: number }>`
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: ${colors.grayscale.$01};
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  transition: transform 0.2s ease;
`;

const RankInfo = styled.div`
  display: flex;
  align-items: center;
  margin-right: 16px;
  width: 40px;
`;

const RankNumber = styled.span`
  font-family: ${fonts.pretendard.$700};
  font-size: 24px;
  color: ${colors.grayscale.$11};
`;

const UserName = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 18px;
  color: ${colors.grayscale.$11};
  flex: 1;
`;

const UserScore = styled.span`
  font-family: ${fonts.pretendard.$700};
  font-size: 30px;
  color: ${colors.grayscale.$11};
  margin-left: 16px;
`;

const ScoreInput = styled.input`
  width: 80px;
  height: 48px;
  border: 1px solid ${colors.grayscale.$04};
  border-radius: 8px;
  background: ${colors.grayscale.$01};
  padding: 0 12px;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: ${colors.grayscale.$11};
  text-align: center;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
    border-color: ${colors.grayscale.$07};
  }

  &::placeholder {
    color: ${colors.grayscale.$07};
  }
`;

const ReasonInput = styled.input`
  flex: 1;
  height: 48px;
  border: 1px solid ${colors.grayscale.$04};
  border-radius: 8px;
  background: ${colors.grayscale.$01};
  padding: 0 12px;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: ${colors.grayscale.$11};

  &:focus {
    outline: none;
    border-color: ${colors.grayscale.$07};
  }

  &::placeholder {
    color: ${colors.grayscale.$07};
  }
`;

const AddButton = styled.button<{ $isActive: boolean }>`
  height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${(props) =>
    props.$isActive
      ? `linear-gradient(145deg, ${colors.grayscale.$07}, ${colors.grayscale.$08})`
      : `linear-gradient(145deg, ${colors.grayscale.$03}, ${colors.grayscale.$04})`};
  color: ${colors.grayscale.$11};
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  cursor: ${(props) => (props.$isActive ? "pointer" : "not-allowed")};
  transition: all 0.2s ease;
  opacity: ${(props) => (props.$isActive ? 1 : 0.7)};

  &:hover {
    transform: ${(props) => (props.$isActive ? "translateY(-2px)" : "none")};
    box-shadow: ${(props) =>
      props.$isActive ? "0 2px 4px rgba(0, 0, 0, 0.1)" : "none"};
  }

  &:active {
    transform: ${(props) => (props.$isActive ? "translateY(0)" : "none")};
  }
`;
const ScoreUpdateForm = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: -12px;
  padding: 0 10px 0 32px;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${colors.grayscale.$03};
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid ${colors.grayscale.$06};
`;

const ModalTitle = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 20px;
  color: ${colors.grayscale.$11};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: ${colors.grayscale.$11};
  cursor: pointer;
  padding: 0;
`;

const HistoryList = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${colors.grayscale.$02};
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.grayscale.$04};
    border-radius: 4px;
  }
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid ${colors.grayscale.$01};

  &:last-child {
    border-bottom: none;
  }
`;

const HistoryLog = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$11};
`;

const HistoryScore = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 18px;
  color: ${colors.grayscale.$11};
  margin-left: 16px;
`;

ScoreAdmin.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default ScoreAdmin;
