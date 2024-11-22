import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import styled from "styled-components";
import { RiKakaoTalkFill } from "react-icons/ri";
import { FaUser, FaQuestionCircle } from "react-icons/fa";
import { colors, fonts } from "@/constants";
import Image from "next/image";
import { useRouter } from "next/router";
import ProfileModal from "../modal/ProfileModal";
import { AnimatePresence } from "framer-motion";

const Header = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <>
      <HeaderLayout>
        <IconWrapper>
        </IconWrapper>
        {session ? (
          <ProfileWrapper onClick={() => setIsProfileModalOpen(true)}>
            {session.user?.image ? (
              <ProfileImage>
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  style={{ borderRadius: "50%" }}
                />
              </ProfileImage>
            ) : (
              <FaUser size={32} />
            )}
            <ProfileName>{session.user?.name || "프로필"}</ProfileName>
          </ProfileWrapper>
        ) : (
          <LoginButton onClick={() => signIn("kakao")}>
            <RiKakaoTalkFill size={20} />
            <LoginText>LogIn</LoginText>
          </LoginButton>
        )}
      </HeaderLayout>
      
      <AnimatePresence>
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      </AnimatePresence>
    </>
  );
};

const HeaderLayout = styled.div`
  display: flex;
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 56px;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  transition: top 0.7s ease-in-out;
  padding: 0 16px;
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: #fee500;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const LoginText = styled.span`
  font-size: 14px;
  font-weight: bold;
  font-family: ${fonts.pretendard.$400};
  color: #000000;
`;

const ProfileWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const ProfileImage = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
`;

const ProfileName = styled.span`
  font-size: 18px;
  font-weight: bold;
  font-family: ${fonts.pretendard.$400};
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
`;

export default Header;
