import styled from "styled-components";
import { useRouter } from "next/router";
import { colors, fonts } from "@/constants";
import { IoGameController } from "react-icons/io5";
import { AiFillHome } from "react-icons/ai";
import { MdLeaderboard } from "react-icons/md";

const Header = () => {
  const router = useRouter();

  const getActiveMenu = (path: string) => {
    return router.pathname === path ? "active" : "";
  };

  return (
    <HeaderLayout>
      <MenuContainer>
        <MenuItemBox>
          <Select className={getActiveMenu("/score")} />
          <MenuItem
            className={getActiveMenu("/score")}
            onClick={() => router.push("/score")}
          >
            <MdLeaderboard size={24} />
            score
          </MenuItem>
        </MenuItemBox>

        <MenuItemBox>
          <Select className={getActiveMenu("/")} />
          <MenuItem
            className={getActiveMenu("/")}
            onClick={() => router.push("/")}
          >
            <AiFillHome size={24} />
            Home
          </MenuItem>
        </MenuItemBox>

        <MenuItemBox>
          <Select className={getActiveMenu("/game")} />
          <MenuItem
            className={getActiveMenu("/game")}
            onClick={() => router.push("/game")}
          >
            <IoGameController size={24} />
            Game
          </MenuItem>
        </MenuItemBox>
      </MenuContainer>
    </HeaderLayout>
  );
};

const HeaderLayout = styled.div`
  display: flex;
  width: 100%;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  height: 56px;
  justify-content: center;
  align-items: center;
  background: transparent;
  box-shadow: 0px -40px 10px rgba(0, 0, 0, 0.3);
`;

const MenuContainer = styled.div`
  display: flex;
  width: 100%;
  height: 150px;
  gap: 5px;
  background-color: ${colors.grayscale.$03};
  justify-content: space-around;
`;

const MenuItemBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MenuItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 30px 40px 30px;
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${(props) =>
    props.className === "active" ? "#ffffff" : `${colors.grayscale.$05}`};
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    color: "#ffffff";
  }
`;

const Select = styled.div`
  width: 60px;
  height: 7px;
  background-color: ${(props) =>
    props.className === "active" ? "#ffffff" : "transparent"};
`;
export default Header;
