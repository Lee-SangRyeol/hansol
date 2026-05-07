import Layout from "../components/layout/layout";
import { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { useSession } from "next-auth/react";
import { showToast } from "@/components/toastBar";
import { useRouter } from "next/router";
import Buzzer from "../components/game/Buzzer";
import Roulette from "../components/game/Roulette";
import QuestionBoard from "../components/game/QuestionBoard";

type TabType = "roulette" | "buzzer" | "question";

const Game = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("roulette");

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
    { id: "roulette" as TabType, label: "룰렛", icon: "🎯" },
    { id: "buzzer" as TabType, label: "버저", icon: "🔔" },
    { id: "question" as TabType, label: "문제", icon: "📝" },
  ];

  const handleSelectTab = async (tabId: TabType) => {
    if (tabId === "buzzer") {
      try {
        await update();
      } catch (error) {
        console.error("세션 이름 동기화 실패:", error);
      }
    }
    setActiveTab(tabId);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "roulette":
        return <Roulette />;
      case "buzzer":
        return <Buzzer />;
      case "question":
        return <QuestionBoard />;
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
              onClick={() => handleSelectTab(tab.id)}
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
  background: ${colors.secondary.$01};
  color: ${colors.secondary.black};
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0px 10px;
`;

const TabContainer = styled.div`
  display: flex;
  background: ${colors.secondary.white};
  border-radius: 16px;
  gap: 4px;
  padding: 4px;
  box-shadow: 0 10px 24px rgba(25, 25, 25, 0.12);
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
      ? colors.primary.$01
      : "transparent"};
  color: ${(props) =>
    props.$isActive ? colors.secondary.white : colors.grayscale.$06};
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
    background: transparent;
    opacity: ${(props) => (props.$isActive ? 1 : 0)};
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: ${(props) => (props.$isActive ? colors.primary.$01 : colors.grayscale.$10)};
    color: ${(props) =>
      props.$isActive ? colors.secondary.white : colors.secondary.black};
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
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
  background: ${colors.secondary.$01};
`;

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default Game;
