import Layout from "../components/layout/layout";
import { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { useSession } from "next-auth/react";
import { showToast } from "@/components/toastBar";
import { useRouter } from "next/navigation";
import Buzzer from "../components/game/Buzzer";
import Blackboard from "../components/game/Blackboard";
import Reasoning from "../components/game/Reasoning";

type TabType = "buzzer" | "blackboard" | "reasoning";

const Game = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("buzzer");

  useEffect(() => {
    if (!session?.user?.name) {
      showToast("로그인이 필요합니다");
      router.replace("/");
      return;
    }
  }, [session, router]);

  if (!session?.user?.name) {
    return null;
  }

  const tabs = [
    { id: "buzzer" as TabType, label: "버저", icon: "🔔" },
    { id: "blackboard" as TabType, label: "칠판", icon: "📝" },
    { id: "reasoning" as TabType, label: "추리", icon: "🔍" },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "buzzer":
        return <Buzzer />;
      case "blackboard":
        return <Blackboard />;
      case "reasoning":
        return <Reasoning />;
      default:
        return null;
    }
  };

  return (
    <Container>
      <HeaderSection>
        <TabContainer>
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              $isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <TabIcon>{tab.icon}</TabIcon>
              <TabLabel>{tab.label}</TabLabel>
            </TabButton>
          ))}
        </TabContainer>
      </HeaderSection>

      <ContentContainer>{renderActiveTab()}</ContentContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  color: white;
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0px;
  background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const TabContainer = styled.div`
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  gap: 4px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border: none;
  background: ${(props) =>
    props.$isActive
      ? "linear-gradient(145deg, #667eea, #764ba2)"
      : "transparent"};
  color: ${(props) => (props.$isActive ? "white" : "rgba(255, 255, 255, 0.7)")};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 90px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${(props) =>
      props.$isActive
        ? "linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent)"
        : "transparent"};
    opacity: ${(props) => (props.$isActive ? 1 : 0)};
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: ${(props) =>
      props.$isActive
        ? "linear-gradient(145deg, #667eea, #764ba2)"
        : "rgba(255, 255, 255, 0.1)"};
    color: white;
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isActive
        ? "0 8px 25px rgba(102, 126, 234, 0.4)"
        : "0 4px 15px rgba(0, 0, 0, 0.2)"};
  }

  &:active {
    transform: translateY(0);
  }
`;

const TabIcon = styled.span`
  font-size: 22px;
  z-index: 1;
  position: relative;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`;

const TabLabel = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  z-index: 1;
  position: relative;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
`;

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default Game;
