import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { colors, fonts } from "@/constants";
import UserInfo from "./UserInfo";
import RoleInfo from "./RoleInfo";

interface UserModalProps {
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

const UserModal = ({ isOpen, onClose }: UserModalProps) => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"info" | "role">("info");
  const [userData, setUserData] = useState<User | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [memberScores, setMemberScores] = useState<{ [key: string]: number }>(
    {}
  );

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

  useEffect(() => {
    if (isOpen && session?.user?.name) {
      fetchTeamData();
    }
  }, [isOpen, session?.user?.name]);

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
        {/* <CloseButton onClick={onClose}>&times;</CloseButton> */}

        <TabContainer>
          <TabButton
            $isActive={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          >
            내 정보
          </TabButton>
          <TabButton
            $isActive={activeTab === "role"}
            onClick={() => setActiveTab("role")}
            style={{ backgroundColor: colors.grayscale.$03 }}
          >
            내 역할
          </TabButton>
        </TabContainer>

        <ContentContainer>
          {activeTab === "info" ? <UserInfo /> : <RoleInfo />}
        </ContentContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

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
  padding: 0;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  z-index: 10;

  &:hover {
    background: ${colors.grayscale.$02};
    color: ${colors.grayscale.$11};
  }
`;

const TabContainer = styled.div`
  display: flex;
  width: 100%;
  min-height: 60px;
  height: 60px;
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

const TabButton = styled.button<{ $isActive: boolean }>`
  width: 50%;
  height: 100%;
  border: none;
  background-color: transparent;
  color: ${(props) =>
    props.$isActive ? colors.grayscale.$11 : colors.grayscale.$07};
  font-family: ${fonts.pretendard.$700};
  font-size: 18px;
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
    height: 3px;
    background-color: ${(props) =>
      props.$isActive ? colors.primary.$02 : "transparent"};
    transition: all 0.3s ease;
  }

  &:hover {
    color: ${colors.grayscale.$11};
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  //   padding: 32px;
  overflow-y: auto;
`;

export default UserModal;
