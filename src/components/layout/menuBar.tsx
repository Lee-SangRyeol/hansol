import { useEffect, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import { colors, fonts } from "@/constants";
import { IoGameController } from "react-icons/io5";
import { AiFillHome } from "react-icons/ai";
import { MdLeaderboard } from "react-icons/md";
import { useSession } from "next-auth/react";

const Header = () => {
  const router = useRouter();
  const { status } = useSession();
  const [hasFriend, setHasFriend] = useState<boolean>(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

  const getActiveMenu = (path: string) => {
    return router.pathname === path ? "active" : "";
  };

  useEffect(() => {
    if (status !== "authenticated") {
      setHasFriend(false);
      return;
    }

    const fetchMe = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) return;
        const me = await response.json();
        setHasFriend(Boolean(me.friendId));
      } catch (error) {
        console.error("Failed to fetch menu guard state:", error);
      }
    };

    fetchMe();
  }, [status]);

  const handleNavigate = (path: "/" | "/score" | "/game") => {
    if ((path === "/score" || path === "/game") && !hasFriend) {
      setIsBlockedModalOpen(true);
      return;
    }
    router.push(path);
  };

  return (
    <>
      <HeaderLayout>
        <MenuContainer>
          <MenuItem
            className={getActiveMenu("/score")}
            onClick={() => handleNavigate("/score")}
          >
            <MdLeaderboard size={22} />
            score
          </MenuItem>

          <MenuItem
            className={getActiveMenu("/")}
            onClick={() => handleNavigate("/")}
          >
            <AiFillHome size={24} />
            home
          </MenuItem>

          <MenuItem
            className={getActiveMenu("/game")}
            onClick={() => handleNavigate("/game")}
          >
            <IoGameController size={22} />
            game
          </MenuItem>
        </MenuContainer>
      </HeaderLayout>

      {isBlockedModalOpen && (
        <ModalOverlay onClick={() => setIsBlockedModalOpen(false)}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalTitle>단짝이 정해질때까지 기다려!</ModalTitle>
            <ModalButton onClick={() => setIsBlockedModalOpen(false)}>
              확인
            </ModalButton>
          </ModalCard>
        </ModalOverlay>
      )}
    </>
  );
};

const HeaderLayout = styled.div`
  width: 100%;
  position: fixed;
  left: 0;
  bottom: 0;
  justify-content: center;
  align-items: center;
  padding: 0 16px 18px;
  z-index: 200;
`;

const MenuContainer = styled.div`
  display: flex;
  width: min(560px, 100%);
  height: 64px;
  border-radius: 22px;
  background: ${colors.secondary.white};
  justify-content: space-between;
  padding: 8px;
  box-shadow: 0 14px 30px rgba(25, 25, 25, 0.18);
`;

const MenuItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 48px;
  border-radius: 14px;
  font-family: ${fonts.pretendard.$600};
  font-size: 12px;
  text-transform: uppercase;
  color: ${(props) =>
    props.className === "active" ? colors.secondary.black : colors.grayscale.$06};
  background: ${(props) =>
    props.className === "active" ? colors.grayscale.$10 : "transparent"};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${colors.grayscale.$10};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
`;

const ModalCard = styled.div`
  width: min(360px, calc(100% - 32px));
  border-radius: 20px;
  background: ${colors.secondary.white};
  padding: 22px;
`;

const ModalTitle = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 18px;
  color: ${colors.secondary.black};
  text-align: center;
`;

const ModalButton = styled.button`
  width: 100%;
  height: 46px;
  border-radius: 12px;
  border: none;
  margin-top: 16px;
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
  font-family: ${fonts.pretendard.$600};
  cursor: pointer;
`;

export default Header;
