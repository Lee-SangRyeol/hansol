import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import { motion } from "framer-motion";
import Image from "next/image";
import { colors, fonts } from "@/constants";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Team {
  members: string[];
  totalScore: number;
}

interface User {
  name: string;
  team: string;
  score: number;
}

interface TeamScore {
  teamName: string;
  totalScore: number;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<User | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [memberScores, setMemberScores] = useState<{ [key: string]: number }>(
    {}
  );

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!session?.user?.name) return;

      try {
        // 유저의 팀 정보 가져오기
        const userResponse = await fetch(
          `/api/users?name=${encodeURIComponent(session.user.name)}`
        );
        if (!userResponse.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData: User = await userResponse.json();

        if (!userData.team) {
          setTeamData(null);
          return;
        } else if (userData.team) {
          setUserData(userData);
        }

        // 팀 정보 가져오기
        const teamResponse = await fetch(
          `/api/teams?name=${encodeURIComponent(userData.team)}`
        );
        if (!teamResponse.ok) {
          throw new Error("Failed to fetch team data");
        }

        const teamData: Team = await teamResponse.json();

        if (!teamData) {
          setTeamData(null);
          return;
        } else if (teamData) {
          setTeamData(teamData);
        }

        // 멤버들의 점수를 한 번에 가져오기
        const memberScoresResponse = await fetch(
          `/api/users?names=${encodeURIComponent(teamData.members.join(","))}`
        );
        if (!memberScoresResponse.ok) {
          throw new Error("Failed to fetch member scores");
        }
        const memberScores = await memberScoresResponse.json();
        setMemberScores(memberScores);
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    };

    if (isOpen && session?.user?.name) {
      fetchTeamData();
    }
  }, [isOpen, session?.user?.name]);

  const handleJoinTeam = async () => {
    if (!session?.user?.name) return;

    try {
      const response = await fetch("/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: session.user.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to join team");
      }

      const data = await response.json();

      if (data.success) {
        // 팀 배정 성공 시 데이터 다시 불러오기
        const fetchTeamData = async () => {
          if (!session?.user?.name) return;

          try {
            const userResponse = await fetch(
              `/api/users?name=${encodeURIComponent(session.user.name)}`
            );
            if (!userResponse.ok) {
              throw new Error("Failed to fetch user data");
            }
            const userData: User = await userResponse.json();

            if (!userData.team) {
              setTeamData(null);
              return;
            } else if (userData.team) {
              setUserData(userData);
            }

            const teamResponse = await fetch(
              `/api/teams?name=${encodeURIComponent(userData.team)}`
            );
            if (!teamResponse.ok) {
              throw new Error("Failed to fetch team data");
            }

            const teamData: Team = await teamResponse.json();

            if (!teamData) {
              setTeamData(null);
              return;
            } else if (teamData) {
              setTeamData(teamData);
            }

            const memberScoresResponse = await fetch(
              `/api/users?names=${encodeURIComponent(
                teamData.members.join(",")
              )}`
            );
            if (!memberScoresResponse.ok) {
              throw new Error("Failed to fetch member scores");
            }
            const memberScores = await memberScoresResponse.json();
            setMemberScores(memberScores);
          } catch (error) {
            console.error("Error fetching team data:", error);
          }
        };

        fetchTeamData();
      }
    } catch (error) {
      console.error("Error joining team:", error);
      // 에러 처리 (필요한 경우 사용자에게 알림)
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <ModalContent
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton onClick={onClose}>&times;</CloseButton>

        <ProfileSection>
          <ProfileImageWrapper>
            {session?.user?.image ? (
              <StyledImage>
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={120}
                  height={120}
                  style={{ borderRadius: "50%" }}
                />
              </StyledImage>
            ) : (
              <DefaultProfileImage>
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </DefaultProfileImage>
            )}
          </ProfileImageWrapper>
          <UserName>{session?.user?.name || "사용자"}</UserName>
        </ProfileSection>

        <TeamSection>
          <SectionHeader>
            <SectionTitle>
              {userData?.team ? "소속팀" : "팀 배정 대기중"}
            </SectionTitle>
          </SectionHeader>
          <TeamCard>
            {teamData ? (
              <>
                <TeamHeader>
                  <TeamName>{userData?.team}</TeamName>
                  <TeamScore>{teamData?.totalScore} 점</TeamScore>
                </TeamHeader>
                <Divider />
                <MemberList>
                  {teamData.members.map((memberName) => (
                    <MemberItem key={memberName}>
                      <MemberName>{memberName}</MemberName>
                      <MemberScore>
                        {memberScores[memberName] || 0} 점
                      </MemberScore>
                    </MemberItem>
                  ))}
                </MemberList>
              </>
            ) : (
              <NoTeamWrapper>
                <NoTeamText>아직 소속된 팀이 없습니다</NoTeamText>
                <JoinTeamButton onClick={handleJoinTeam}>
                  팀 배정받기
                </JoinTeamButton>
              </NoTeamWrapper>
            )}
          </TeamCard>
        </TeamSection>
      </ModalContent>
    </ModalOverlay>
  );
};
const MemberList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TeamCard = styled.div`
  background: ${colors.grayscale.$02};
  border-radius: 12px;
  padding: 20px;
`;
const TeamSection = styled.div`
  margin-top: 24px;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  position: relative;
  background: ${colors.grayscale.$04};
  border-radius: 20px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
`;

const ProfileImageWrapper = styled.div`
  margin-bottom: 16px;
`;

const DefaultProfileImage = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: ${colors.grayscale.$07};
`;

const UserName = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 24px;
  color: ${colors.grayscale.$11};
  margin: 0 0 4px 0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: ${colors.grayscale.$09};
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.grayscale.$02};
    color: ${colors.grayscale.$11};
  }
`;

const StyledImage = styled.div``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TeamHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TeamScore = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 26px;
  color: ${colors.primary.$03};
`;

const Divider = styled.div`
  height: 1px;
  background: ${colors.grayscale.$03};
  margin: 0 -20px 16px;
`;

const MemberName = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$09};
`;

const MemberScore = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${colors.grayscale.$08};
`;

const MemberItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${colors.grayscale.$03};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

const NoTeamWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 1px solid ${colors.grayscale.$03};
  border-radius: 12px;
  text-align: center;
`;

const NoTeamText = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: ${colors.grayscale.$09};
  margin-bottom: 16px;
`;

const JoinTeamButton = styled.button`
  background: ${colors.primary.$02};
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.primary.$01};
  }
`;

const TeamName = styled.h3`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0;
`;

const SectionTitle = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0;
`;

export default ProfileModal;
