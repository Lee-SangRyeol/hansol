import Layout from "../components/layout/layout";
import { ReactElement, useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Fa1, Fa2, Fa3, Fa4, Fa5 } from "react-icons/fa6";
import { showToast } from "@/components/toastBar";
import { useRouter } from "next/navigation";

let socket: Socket | null = null;

const Game = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isBuzzing, setIsBuzzing] = useState<boolean>(false);

  useEffect(() => {
    if (!session?.user?.name) {
      showToast('로그인ㄱ');
      router.replace('/');
      return;
    }

    handleConnect();

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        setIsConnected(false);
        setMessages([]);
      }
    };
  }, [session, router]);

  if (!session?.user?.name) {
    return null;
  }

  // 소켓 연결 핸들러
  const handleConnect = () => {
    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ['websocket'] 
      });

      socket.on("connect", () => {
        console.log("Connected to server:", socket!.id);
        setIsConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
        setMessages([]);
      });

      // 서버에서 전체 버저 순서 업데이트를 받음
      socket.on("buzzer_order", (orderList: string[]) => {
        setMessages(orderList);
      });

      socket.on("buzzer_failed", (message: string) => {
        showToast(message);
      });
    }
  };

  const handleBuzzerPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    if (socket && isConnected && !isBuzzing) {
      // 서버에 버저 이벤트만 전송
      socket.emit("buzzer_press", session?.user.name);
      setIsBuzzing(true);

      setTimeout(() => {
        setIsBuzzing(false);
      }, 5000);
    }
  };

  const handleReset = () => {
    if (socket && isConnected) {
      socket.emit("reset_buzzer");
    }
  };

  return (
    <Container>
      <TopCard>
        <BuzzerOrderList>
          <OrderListText1St>
            <IconWrapper>
              <Fa1 size={24} color="#FFD700" />
            </IconWrapper>
            <NameWrapper1st>
              <span>{messages[0] || ""}</span>
            </NameWrapper1st>
          </OrderListText1St>
          <Divider />
          <OrderListText>
            <IconWrapper>
              <Fa2 size={20} color="#C0C0C0" />
            </IconWrapper>
            <NameWrapper>
              <span>{messages[1] || ""}</span>
            </NameWrapper>
          </OrderListText>
          <Divider />
          <OrderListText>
            <IconWrapper>
              <Fa3 size={20} color="#CD7F32" />
            </IconWrapper>
            <NameWrapper>
              <span>{messages[2] || ""}</span>
            </NameWrapper>
          </OrderListText>
          <Divider />
          <OrderListText>
            <IconWrapper>
              <Fa4 size={20} color="#808080" />
            </IconWrapper>
            <NameWrapper>
              <span>{messages[3] || ""}</span>
            </NameWrapper>
          </OrderListText>
          <Divider />
          <OrderListText>
            <IconWrapper>
              <Fa5 size={20} color="#808080" />
            </IconWrapper>
            <NameWrapper>
              <span>{messages[4] || ""}</span>
            </NameWrapper>
          </OrderListText>
        </BuzzerOrderList>
      </TopCard>
      <BottomCard>
        {!isConnected ? (
          <ConnectButton onClick={handleConnect}>연결중...</ConnectButton>
        ) : // admin이면 리셋 버튼, 아니면 버저 버튼
        session?.user?.role === "admin" ? (
          <ResetButton onClick={handleReset}>Reset</ResetButton>
        ) : (
          <BuzzerButton
            onTouchStart={handleBuzzerPress}
            onMouseDown={handleBuzzerPress}
            onClick={(e: { preventDefault: () => void }) => e.preventDefault()}
            isBuzzing={isBuzzing}
            disabled={isBuzzing}
          >
            {isBuzzing ? "Wait, 5s" : "Push"}
          </BuzzerButton>
        )}
      </BottomCard>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 50px 16px 130px 16px;
  gap: 16px;
`;

const TopCard = styled.div`
  height: 70vh;
  background: linear-gradient(
    145deg,
    ${colors.grayscale.$01},
    ${colors.grayscale.$02}
  );
  border-radius: 16px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1),
    inset 0 2px 3px rgba(255, 255, 255, 0.1);
  padding: 16px;
  position: relative;
  overflow-y: auto;
  user-select: none;
  -webkit-user-select: none;
`;

const BottomCard = styled.div`
  height: 25vh;
  background-color: ${colors.grayscale.$01};
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  padding: 16px;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const BuzzerButton = styled.button<{ isBuzzing: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: none;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  position: relative;

  /* 기본 상태 (눌리지 않은 상태) */
  background: radial-gradient(circle at 30% 30%, #ff5252, #d32f2f);
  color: white;
  box-shadow: 0 10px 0 #b71c1c, 0 11px 15px rgba(0, 0, 0, 0.3),
    inset 0 -8px 12px #b71c1c, inset 0 8px 12px rgba(255, 255, 255, 0.3);
  transform: translateY(0);
  transition: all 0.1s ease;

  /* 호버 효과 */
  &:hover:not(:disabled) {
    background: radial-gradient(circle at 30% 30%, #ff6b6b, #ef5350);
    transform: translateY(2px);
    box-shadow: 0 8px 0 #b71c1c, 0 9px 10px rgba(0, 0, 0, 0.3),
      inset 0 -8px 12px #b71c1c, inset 0 8px 12px rgba(255, 255, 255, 0.3);
  }

  /* 눌린 상태 */
  &:active:not(:disabled) {
    transform: translateY(8px);
    box-shadow: 0 2px 0 #b71c1c, 0 3px 6px rgba(0, 0, 0, 0.3),
      inset 0 -4px 8px #b71c1c, inset 0 4px 8px rgba(255, 255, 255, 0.3);
  }

  /* 비활성화 상태 (isBuzzing이 true일 때) */
  ${(props) =>
    props.isBuzzing &&
    `
    background: radial-gradient(circle at 30% 30%, #9e9e9e, #757575);
    box-shadow: 
      0 4px 0 #424242,
      0 5px 10px rgba(0, 0, 0, 0.2),
      inset 0 -4px 8px #424242,
      inset 0 4px 8px rgba(255, 255, 255, 0.2);
    transform: translateY(6px);
    cursor: not-allowed;
    opacity: 0.8;
  `}

  /* 버튼 내부에 원형 그라데이션 효과 추가 */
  &::before {
    content: "";
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.1) 20%,
      transparent 60%
    );
    pointer-events: none;
  }

  /* 텍스트에 약간의 그림자 효과 */
  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.4);
`;

const BuzzerOrderList = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  position: absolute;
  top: 10%;
  left: 0;
  width: 100%;
  height: 80%;
`;

const OrderListText = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100px;
`;

const OrderListText1St = styled(OrderListText)`
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent);
  border-radius: 12px;
  padding: 8px;
  transform: scale(1.05);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.07);
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 20%;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const NameWrapper1st = styled.div`
  flex: 1;
  text-align: center;
  color: #29ff69;
  font-size: 32px;
  font-family: ${fonts.pretendard.$800};
  text-shadow: 0 0 10px rgba(41, 255, 105, 0.3);
  letter-spacing: 1px;
`;

const NameWrapper = styled.div`
  flex: 1;
  text-align: center;
  color: ${colors.grayscale.$10};
  font-size: 22px;
  font-family: ${fonts.pretendard.$600};
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.grayscale.$11};
  }
`;

const Divider = styled.div`
  width: 60%;
  border-top: 2px dotted rgba(255, 255, 255, 0.1);
  margin: auto;
`;

const ConnectButton = styled.button`
  padding: 12px 24px;
  background-color: ${colors.grayscale.$01};
  border: 2px solid #4caf50;
  border-radius: 8px;
  color: #4caf50;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;

  &:hover {
    background-color: #4caf50;
    color: white;
  }
`;

const ResetButton = styled.button`
  width: 150px;
  height: 80px;
  border-radius: 25px;
  background-color: #ff0000; // 빨간색
  border: none;
  color: white;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  &:active {
    background-color: #ff69b4; // 분홍색으로 변경
    transform: translate(-50%, -50%) scale(0.95);
  }

  &:hover {
    opacity: 0.9;
  }

  -webkit-tap-highlight-color: transparent;
`;

Game.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export default Game;
