import { useState, useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { gameData, GameData, GameCategory } from "@/data/gameData";

interface BlackboardModalProps {
  onClose: () => void;
  onAddContent: (gameType: string, category: string, content: string) => void;
}

interface Team {
  _id: string;
  name: string;
  members: string[];
  totalScore: number;
}

const BlackboardModal = ({ onClose, onAddContent }: BlackboardModalProps) => {
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | null>(
    null
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // 팀 목록 가져오기
  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await fetch("/api/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleGameSelect = (game: GameData) => {
    setSelectedGame(game);

    // 팀지목인 경우 팀 목록을 가져옴
    if (game.id === "team-selection") {
      fetchTeams();
      setSelectedCategory(null);
    } else {
      setSelectedCategory(game.categories[0]);
    }
    setCurrentItemIndex(0);
  };

  const handleCategorySelect = (category: GameCategory) => {
    setSelectedCategory(category);
    setCurrentItemIndex(0);
  };

  const handlePreviousItem = () => {
    if (selectedCategory) {
      const newIndex =
        currentItemIndex === 0
          ? selectedCategory.items.length - 1
          : currentItemIndex - 1;
      setCurrentItemIndex(newIndex);

      // 칠판에 즉시 업데이트
      if (selectedGame && selectedCategory) {
        const content = selectedCategory.items[newIndex];
        onAddContent(selectedGame.name, selectedCategory.name, content);
      }
    }
  };

  const handleNextItem = () => {
    if (selectedCategory) {
      const newIndex =
        currentItemIndex === selectedCategory.items.length - 1
          ? 0
          : currentItemIndex + 1;
      setCurrentItemIndex(newIndex);

      // 칠판에 즉시 업데이트
      if (selectedGame && selectedCategory) {
        const content = selectedCategory.items[newIndex];
        onAddContent(selectedGame.name, selectedCategory.name, content);
      }
    }
  };

  const handleTeamSelect = (team: Team) => {
    // 팀 이름만 칠판에 표시
    onAddContent("팀 지목", "팀 목록", team.name);
  };

  const handleAddToBlackboard = () => {
    if (selectedGame && selectedCategory) {
      const content = selectedCategory.items[currentItemIndex];
      onAddContent(selectedGame.name, selectedCategory.name, content);
      // 모달을 닫지 않음
    }
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
    setSelectedCategory(null);
    setCurrentItemIndex(0);
    setTeams([]);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setCurrentItemIndex(0);
  };

  const getGameIcon = (gameId: string) => {
    switch (gameId) {
      case "body-language":
        return "🎭";
      case "movie-guess":
        return "🎬";
      case "team-selection":
        return "👥";
      default:
        return "🎮";
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>게임 내용 추가</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <ModalBody>
          {!selectedGame ? (
            <GameSelection>
              <SectionTitle>게임을 선택하세요</SectionTitle>
              <GameList>
                {gameData.map((game) => (
                  <GameCard
                    key={game.id}
                    onClick={() => handleGameSelect(game)}
                  >
                    <GameIcon>{getGameIcon(game.id)}</GameIcon>
                    <GameName>{game.name}</GameName>
                  </GameCard>
                ))}
              </GameList>
            </GameSelection>
          ) : selectedGame.id === "team-selection" ? (
            <TeamSelection>
              <SectionHeader>
                <BackButton onClick={handleBackToGames}>← 뒤로</BackButton>
                <SectionTitle>팀 지목</SectionTitle>
              </SectionHeader>

              {loadingTeams ? (
                <LoadingText>팀 목록을 불러오는 중...</LoadingText>
              ) : teams.length === 0 ? (
                <NoTeamsText>등록된 팀이 없습니다</NoTeamsText>
              ) : (
                <TeamList>
                  {teams.map((team) => (
                    <TeamCard
                      key={team._id}
                      onClick={() => handleTeamSelect(team)}
                    >
                      <TeamName>{team.name}</TeamName>
                      <TeamInfo>
                        <TeamMembers>{team.members.length}명</TeamMembers>
                        <TeamScore>{team.totalScore}점</TeamScore>
                      </TeamInfo>
                    </TeamCard>
                  ))}
                </TeamList>
              )}
            </TeamSelection>
          ) : !selectedCategory ? (
            <CategorySelection>
              <SectionHeader>
                <BackButton onClick={handleBackToGames}>← 뒤로</BackButton>
                <SectionTitle>{selectedGame.name}</SectionTitle>
              </SectionHeader>
              <CategoryList>
                {selectedGame.categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                  >
                    <CategoryName>{category.name}</CategoryName>
                    <CategoryCount>{category.items.length}개</CategoryCount>
                  </CategoryCard>
                ))}
              </CategoryList>
            </CategorySelection>
          ) : (
            <ItemSelection>
              <SectionHeader>
                <BackButton onClick={handleBackToCategories}>← 뒤로</BackButton>
                <SectionTitle>{selectedCategory.name}</SectionTitle>
              </SectionHeader>

              <ItemDisplay>
                <ItemContent>
                  {selectedGame.id === "movie-guess" ? (
                    <MovieImage
                      src={`/images/movies/${selectedCategory.items[currentItemIndex]}`}
                      alt="Movie poster"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const placeholder = e.currentTarget
                          .nextElementSibling as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = "flex";
                        }
                      }}
                    />
                  ) : (
                    <ItemText>
                      {selectedCategory.items[currentItemIndex]}
                    </ItemText>
                  )}
                  <ImagePlaceholder>
                    이미지를 불러올 수 없습니다
                  </ImagePlaceholder>
                </ItemContent>

                <NavigationControls>
                  <NavButton onClick={handlePreviousItem}>←</NavButton>
                  <ItemCounter>
                    {currentItemIndex + 1} / {selectedCategory.items.length}
                  </ItemCounter>
                  <NavButton onClick={handleNextItem}>→</NavButton>
                </NavigationControls>
              </ItemDisplay>

              <ActionButtons>
                <AddButton onClick={handleAddToBlackboard}>
                  칠판에 추가
                </AddButton>
                <InfoText>화살표를 눌러서 다음/이전 항목을 확인하세요</InfoText>
              </ActionButtons>
            </ItemSelection>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
  border-radius: 20px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-family: ${fonts.pretendard.$700};
  font-size: 24px;
  color: white;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: #e74c3c;
    transform: scale(1.1);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.pretendard.$700};
  font-size: 20px;
  color: white;
  margin: 0;
`;

const GameSelection = styled.div``;

const GameList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const GameCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }
`;

const GameIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const GameName = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 18px;
  color: white;
`;

const TeamSelection = styled.div``;

const TeamList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const TeamCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #f39c12;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
  }
`;

const TeamName = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 20px;
  color: white;
  margin-bottom: 12px;
`;

const TeamInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TeamMembers = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const TeamScore = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: #f39c12;
`;

const LoadingText = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 40px;
`;

const NoTeamsText = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 40px;
`;

const CategorySelection = styled.div``;

const CategoryList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const CategoryCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #f39c12;
    transform: translateY(-2px);
  }
`;

const CategoryName = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: white;
  margin-bottom: 8px;
`;

const CategoryCount = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
`;

const ItemSelection = styled.div``;

const ItemDisplay = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  text-align: center;
`;

const ItemContent = styled.div`
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
`;

const ItemText = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 32px;
  color: white;
  text-align: center;
  line-height: 1.2;
`;

const MovieImage = styled.img`
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

const ImagePlaceholder = styled.div`
  display: none;
  font-family: ${fonts.pretendard.$500};
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const NavigationControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
`;

const NavButton = styled.button`
  width: 50px;
  height: 50px;
  border: none;
  background: linear-gradient(145deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }
`;

const ItemCounter = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const AddButton = styled.button`
  padding: 16px 32px;
  background: linear-gradient(145deg, #27ae60, #2ecc71);
  border: none;
  border-radius: 12px;
  color: white;
  font-family: ${fonts.pretendard.$600};
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
  }
`;

const InfoText = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
`;

export default BlackboardModal;
