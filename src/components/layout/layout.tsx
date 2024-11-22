import styled from "styled-components";
import { useRouter } from "next/router";
import Header from "./header";
import MenuBar from "./menuBar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const isHome = router.pathname === "/";

  return (
    <Container>
      {isHome && <Header />}
      <MainWrapper>
        <MainContent>{children}</MainContent>
      </MainWrapper>
      <MenuBar />
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

const ProfileIcon = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  cursor: pointer;
`;

export default Layout;
