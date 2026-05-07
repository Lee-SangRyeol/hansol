import styled from "styled-components";
import { useRouter } from "next/router";
import MenuBar from "./menuBar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const isOnboarding = router.pathname === "/onboarding";

  return (
    <Container>
      <MainWrapper>
        <MainContent>{children}</MainContent>
      </MainWrapper>
      {!isOnboarding && <MenuBar />}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainWrapper = styled.div`
  flex-direction: column;
  transition: all 0.3s ease-in-out;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex: 1;
`;

export default Layout;
