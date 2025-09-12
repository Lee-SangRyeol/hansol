import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import Image from "next/image";
import { colors, fonts } from "@/constants";

interface Team {
  members: string[];
  totalScore: number;
}

interface User {
  name: string;
  team: string;
  score: number;
}

const UserInfo = () => {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<User | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [memberScores, setMemberScores] = useState<{ [key: string]: number }>(
    {}
  );

  const fetchTeamData = useCallback(async () => {
    if (!session?.user?.name) return;

    try {
      // 유저의 팀 정보 가져오기
      const userResponse = await fetch(
        `/api/users?name=${encodeURIComponent(session.user.name)}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      const fetchedUser: User = await userResponse.json();

      if (!fetchedUser.team) {
        setUserData(fetchedUser);
        setTeamData(null);
        setMemberScores({});
        return;
      } else {
        setUserData(fetchedUser);
      }

      // 팀 정보 가져오기
      const teamResponse = await fetch(
        `/api/teams?name=${encodeURIComponent(fetchedUser.team)}`
      );
      if (!teamResponse.ok) {
        throw new Error("Failed to fetch team data");
      }

      const fetchedTeam: Team = await teamResponse.json();

      if (!fetchedTeam) {
        setTeamData(null);
        setMemberScores({});
        return;
      } else {
        setTeamData(fetchedTeam);
      }

      // 멤버들의 점수를 한 번에 가져오기
      const memberScoresResponse = await fetch(
        `/api/users?names=${encodeURIComponent(fetchedTeam.members.join(","))}`
      );
      if (!memberScoresResponse.ok) {
        throw new Error("Failed to fetch member scores");
      }
      const scores = await memberScoresResponse.json();
      setMemberScores(scores);
    } catch (error) {
      console.error("Error fetching team data:", error);
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (session?.user?.name) {
      fetchTeamData();
    }
  }, [session?.user?.name, fetchTeamData]);

  const refetch = async () => {
    await fetchTeamData();
  };

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
        await refetch();
      }
    } catch (error) {
      console.error("Error joining team:", error);
      console.log("Error joining team:", error);
    }
  };

  return (
    <UserInfoContainer>
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
    </UserInfoContainer>
  );
};

const UserInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 32px;
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

const StyledImage = styled.div``;

const TeamSection = styled.div`
  flex: 1;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TeamCard = styled.div`
  background: ${colors.grayscale.$02};
  border-radius: 12px;
  padding: 20px;
`;

const TeamHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TeamName = styled.h3`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0;
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

const MemberList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
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

const SectionTitle = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0;
`;

export default UserInfo;
