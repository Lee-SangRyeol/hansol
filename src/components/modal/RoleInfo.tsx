import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import Image from "next/image";
import AssignCharacter from "../AssignCharacter";

interface Character {
  _id: string;
  name: string;
  description: string;
  instructions: string[];
  image: string;
  order: number;
  isSpecial?: boolean;
  specialInstructions?: string[];
}

const RoleInfo = () => {
  const { data: session } = useSession();
  const [userCharacter, setUserCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  //   const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);

  //   useEffect(() => {
  //     const fetchCharacter = async () => {
  //       if (!session?.user?.name) {
  //         setLoading(false);
  //         return;
  //       }
  //       console.log("RoleInfo에서 name : ", session.user.name);

  //       try {
  //         const response = await fetch(
  //           `http://localhost:3000/api/character?name=${session.user.name}`
  //         );
  //         if (response.ok) {
  //           const character = await response.json();
  //           setUserCharacter(character);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching character:", error);
  //         // 에러 시 기본 캐릭터 사용
  //         ("에러나서 역할 못보는중");
  //       } finally {
  //         setLoading(false);
  //         console.log("userCharacter : ", userCharacter);
  //       }
  //     };

  //     fetchCharacter();
  //   }, [session?.user?.name]);

  useEffect(() => {
    refetch();
  }, [session?.user?.name]);

  const refetch = async () => {
    if (!session?.user?.name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/character?name=${encodeURIComponent(session.user.name)}`
      );
      if (response.ok) {
        const character = await response.json();
        setUserCharacter(character);
      } else {
        setUserCharacter(null);
      }
    } catch (error) {
      console.error("Error fetching character:", error);
      setUserCharacter(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!session?.user?.name) {
        setLoading(false);
        return;
      }
      console.log("RoleInfo에서 name : ", session.user.name);

      try {
        const response = await fetch(
          `/api/character?name=${encodeURIComponent(session.user.name)}`
        );
        if (response.ok) {
          const character = await response.json();
          setUserCharacter(character);
        } else {
          // 404 등: 캐릭터 미배정으로 간주
          setUserCharacter(null);
        }
      } catch (error) {
        console.error("Error fetching character:", error);
        setUserCharacter(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [session?.user?.name]);

  const handleAssignCharacter = async () => {
    const characterName = "";
    if (!session?.user?.name) return;
    setAssigning(true);
    try {
      const resp = await fetch("/api/character", {
        // POST 요청으로 변경
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: session.user.name,
          characterName,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || "배정 실패");
      }
      refetch(); // 배정 완료 후 다시 조회
    } catch (e) {
      console.error(e);
      alert("역할 배정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <RoleInfoContainer>
        <LoadingText>캐릭터 정보를 불러오는 중...</LoadingText>
      </RoleInfoContainer>
    );
  }

  if (userCharacter === null) {
    return (
      <RoleInfoContainer>
        <EmptyAssignWrapper>
          <AssignTitle>아직 역할이 배정되지 않았어요</AssignTitle>
          <AssignHint>아래 버튼을 눌러 역할을 배정받으세요.</AssignHint>
          {/* <AssignButton onClick={() => setShowAssign(true)}> */}
          <AssignButton onClick={() => handleAssignCharacter()}>
            역할 배정받기
          </AssignButton>
        </EmptyAssignWrapper>

        {/* {showAssign && (
          <AssignCharacter
            onClose={() => setShowAssign(false)}
            onAssigned={() => {
              // 배정 완료 후 다시 조회
              setLoading(true);
              setShowAssign(false);
              (async () => {
                try {
                  const resp = await fetch(
                    `/api/character?name=${encodeURIComponent(
                      session?.user?.name || ""
                    )}`
                  );
                  if (resp.ok) {
                    const c = await resp.json();
                    setUserCharacter(c);
                  }
                } finally {
                  setLoading(false);
                }
              })();
            }}
          />
        )} */}
      </RoleInfoContainer>
    );
  }

  if (!userCharacter) {
    return (
      <RoleInfoContainer>
        <ErrorText>캐릭터 정보를 불러올 수 없습니다.</ErrorText>
      </RoleInfoContainer>
    );
  }

  return (
    <RoleInfoContainer>
      <HeaderSection>
        <CharacterImageWrapper>
          <CharacterImage
            src={`/character/${userCharacter.name}.png`}
            alt={userCharacter.name}
            width={140}
            height={140}
          />
        </CharacterImageWrapper>
        <CharacterName>{userCharacter.name}</CharacterName>
        <CharacterDescription>{userCharacter.description}</CharacterDescription>
      </HeaderSection>

      <InstructionsSection>
        <SectionTitle>지령</SectionTitle>
        <InstructionsList>
          {userCharacter.instructions.map((instruction, index) => (
            <InstructionItem key={index}>
              <InstructionNumber>o</InstructionNumber>
              <InstructionText>{instruction}</InstructionText>
            </InstructionItem>
          ))}
        </InstructionsList>
      </InstructionsSection>
      {/* 
      <GameRulesSection>
        <SectionTitle>게임 규칙</SectionTitle>
        <RulesList>
          <RuleItem>
            • 지령은 꼭 해야합니다. 나중에 게임이 끝나고 지령을 수행한지
            확인할꺼에요.
          </RuleItem>
          <RuleItem>
            • 항상 해야한다와 같은 지시가 없다면, 3번 이상의 행동을 해야하고,
            3명이상이 동의를 받아야해요.
          </RuleItem>
          <RuleItem>• 3번으로 부족할꺼같으면 더 하세요</RuleItem>
          <RuleItem>• 지목은 한사람에게는 한번만 가능.</RuleItem>
        </RulesList>
      </GameRulesSection>

      <UserInfoSection>
        <InfoItem>
          <InfoLabel>캐릭터</InfoLabel>
          <InfoValue>{userCharacter.name}</InfoValue>
        </InfoItem>
        <InfoItem>
          <InfoLabel>사용자명</InfoLabel>
          <InfoValue>{session?.user?.name || "알 수 없음"}</InfoValue>
        </InfoItem>
        <InfoItem>
          <InfoLabel>상태</InfoLabel>
          <InfoValue>활성</InfoValue>
        </InfoItem>
      </UserInfoSection> */}
    </RoleInfoContainer>
  );
};

const RoleInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 32px;
  background-color: ${colors.grayscale.$03};
`;

const LoadingText = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$09};
`;

const ErrorText = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$07};
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  text-align: center;
`;

const CharacterImageWrapper = styled.div`
  border-radius: 50%;
  overflow: hidden;
`;

const CharacterImage = styled(Image)`
  border-radius: 100%;
  border: 5px solid ${colors.primary.$02};
`;

const CharacterName = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0 0 8px 0;
`;

const CharacterDescription = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$09};
  margin: 0;
  line-height: 1.5;
`;

const InstructionsSection = styled.div`
  flex: 1;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.pretendard.$600};
  font-size: 20px;
  color: ${colors.grayscale.$11};
  margin: 0 0 16px 0;
`;

const InstructionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InstructionItem = styled.li`
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid ${colors.grayscale.$03};

  &:last-child {
    border-bottom: none;
  }
`;

const InstructionNumber = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: ${colors.primary.$02};
  margin-right: 12px;
  min-width: 20px;
`;

const InstructionText = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$10};
  line-height: 1.5;
`;

const GameRulesSection = styled.div`
  margin-bottom: 24px;
`;

const RulesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const RuleItem = styled.li`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: ${colors.grayscale.$08};
  margin-bottom: 8px;
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
`;

const UserInfoSection = styled.div`
  background: ${colors.grayscale.$02};
  border-radius: 12px;
  padding: 20px;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${colors.grayscale.$03};
  }
`;

const InfoLabel = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: ${colors.grayscale.$08};
`;

const InfoValue = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${colors.grayscale.$11};
`;

const EmptyAssignWrapper = styled.div`
  flex: 1;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const AssignTitle = styled.h3`
  font-family: ${fonts.pretendard.$700};
  font-size: 20px;
  color: ${colors.grayscale.$11};
  margin: 0;
`;

const AssignHint = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: ${colors.grayscale.$08};
  margin: 0 0 8px 0;
`;

const AssignButton = styled.button`
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: ${colors.primary.$02};
  color: #fff;
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.9;
  }
`;

export default RoleInfo;
