import { useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Fa1, Fa2, Fa3, Fa4, Fa5 } from "react-icons/fa6";
import { showToast } from "@/components/toastBar";

let socket: Socket | null = null;

const Buzzer = () => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isBuzzing, setIsBuzzing] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);

  useEffect(() => {
    if (!session?.user?.name) return;

    handleConnect();

    return () => {
      if (socket) {
        socket = null;
        setIsConnected(false);
        setMessages([]);
        setIsGameStarted(false);
      }
    };
  }, [session?.user?.name]);

  // 소켓 연결 핸들러
  const handleConnect = () => {
    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      setIsConnected(true);

      // 서버에서 전체 버저 순서 업데이트를 받음
      socket.on("buzzer_order", (orderList: string[]) => {
        setMessages(orderList);
      });

      socket.on("buzzer_failed", (message: string) => {
        showToast(message);
      });

      // 게임 상태 업데이트를 받음
      socket.on("game_state", (gameStarted: boolean) => {
        setIsGameStarted(gameStarted);
      });
    }
  };

  const handleBuzzerPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    // 시작 전엔 비활성(실행 안 함), 시작 후 누르면 대기 상태로 전환
    if (socket && isConnected && !isBuzzing && isGameStarted) {
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
      setIsGameStarted(false);
      setIsBuzzing(false);
    }
  };

  const handleStart = () => {
    if (socket && isConnected) {
      socket.emit("start_game");
      setIsGameStarted(true);
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
        ) : session?.user?.role === "admin" ? (
          isGameStarted ? (
            <ResetButton onClick={handleReset}>Reset</ResetButton>
          ) : (
            <StartButton onClick={handleStart}>Start</StartButton>
          )
        ) : (
          <BuzzerButton
            onTouchStart={handleBuzzerPress}
            onMouseDown={handleBuzzerPress}
            onClick={(e: { preventDefault: () => void }) => e.preventDefault()}
            $isBuzzing={isBuzzing}
            disabled={!isGameStarted || isBuzzing}
          >
            {!isGameStarted ? "Wait" : isBuzzing ? "Wait" : "Push"}
          </BuzzerButton>
        )}
      </BottomCard>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 85%;
  padding: 20px;
  background: ${colors.secondary.$01};
  color: ${colors.secondary.black};
`;

const TopCard = styled.div`
  flex: 1;
  background: ${colors.secondary.white};
  border-radius: 20px;
  box-shadow: 0 10px 24px rgba(25, 25, 25, 0.12);
  padding: 24px;
  position: relative;
  overflow-y: auto;
  user-select: none;
  -webkit-user-select: none;
  border: 1px solid ${colors.grayscale.$10};
  margin-bottom: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(145deg, #667eea, #764ba2);
    border-radius: 3px;
  }
`;

const BottomCard = styled.div`
  //   height: 120px;
  //   background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
  //   border-radius: 20px;
  //   box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4),
  //     inset 0 2px 4px rgba(255, 255, 255, 0.1);
  //   padding: 20px;
  //   user-select: none;
  //   -webkit-user-select: none;
  //   position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  //   border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BuzzerButton = styled.button<{ $isBuzzing: boolean }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: none;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  position: relative;
  background: ${(props) =>
    props.$isBuzzing
      ? "linear-gradient(145deg, #9e9e9e, #757575)"
      : "linear-gradient(145deg, #ff5252, #d32f2f)"};
  color: white;
  box-shadow: ${(props) =>
    props.$isBuzzing
      ? "0 4px 0 #424242, 0 5px 10px rgba(0, 0, 0, 0.2), inset 0 -4px 8px #424242, inset 0 4px 8px rgba(255, 255, 255, 0.2)"
      : "0 8px 0 #b71c1c, 0 10px 20px rgba(0, 0, 0, 0.4), inset 0 -6px 10px #b71c1c, inset 0 6px 10px rgba(255, 255, 255, 0.3)"};
  transform: translateY(0);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$isBuzzing
        ? "linear-gradient(145deg, #9e9e9e, #757575)"
        : "linear-gradient(145deg, #ff6b6b, #ef5350)"};
    transform: translateY(2px);
    box-shadow: ${(props) =>
      props.$isBuzzing
        ? "0 4px 0 #424242, 0 5px 10px rgba(0, 0, 0, 0.2), inset 0 -4px 8px #424242, inset 0 4px 8px rgba(255, 255, 255, 0.2)"
        : "0 6px 0 #b71c1c, 0 8px 15px rgba(0, 0, 0, 0.4), inset 0 -6px 10px #b71c1c, inset 0 6px 10px rgba(255, 255, 255, 0.3)"};
  }

  &:active:not(:disabled) {
    transform: translateY(6px);
    box-shadow: ${(props) =>
      props.$isBuzzing
        ? "0 4px 0 #424242, 0 5px 10px rgba(0, 0, 0, 0.2), inset 0 -4px 8px #424242, inset 0 4px 8px rgba(255, 255, 255, 0.2)"
        : "0 2px 0 #b71c1c, 0 3px 8px rgba(0, 0, 0, 0.4), inset 0 -3px 6px #b71c1c, inset 0 3px 6px rgba(255, 255, 255, 0.3)"};
  }

  ${(props) =>
    props.$isBuzzing &&
    `
    cursor: not-allowed;
    opacity: 0.8;
  `}

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

  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.4);
`;

const BuzzerOrderList = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 20px;
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
  height: 80px;
  background: ${colors.grayscale.$10};
  border-radius: 12px;
  border: 1px solid ${colors.grayscale.$09};
  transition: all 0.3s ease;

  &:hover {
    background: ${colors.grayscale.$09};
    transform: translateX(4px);
  }
`;

const OrderListText1St = styled(OrderListText)`
  background: ${colors.secondary.$01};
  border: 1px solid ${colors.primary.$03};
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);

  &:hover {
    transform: scale(1.04) translateX(4px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  left: 20px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const NameWrapper1st = styled.div`
  flex: 1;
  text-align: center;
  color: ${colors.primary.$01};
  font-size: 28px;
  font-family: ${fonts.pretendard.$800};
  letter-spacing: 1px;
`;

const NameWrapper = styled.div`
  flex: 1;
  text-align: center;
  color: ${colors.secondary.black};
  font-size: 20px;
  font-family: ${fonts.pretendard.$600};
  transition: color 0.3s ease;

  &:hover {
    color: ${colors.secondary.black};
  }
`;

const Divider = styled.div`
  width: 60%;
  border-top: 2px dotted ${colors.grayscale.$08};
  margin: auto;
`;

const ConnectButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
  border: 2px solid #4caf50;
  border-radius: 12px;
  color: #4caf50;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  &:hover {
    background: linear-gradient(145deg, #4caf50, #45a049);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }
`;

const StartButton = styled.button`
  width: 140px;
  height: 70px;
  border-radius: 20px;
  background: linear-gradient(145deg, #4caf50, #45a049);
  border: none;
  color: white;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);

  &:active {
    transform: translateY(2px);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
  }

  -webkit-tap-highlight-color: transparent;
`;

const ResetButton = styled.button`
  width: 140px;
  height: 70px;
  border-radius: 20px;
  background: linear-gradient(145deg, #ff5252, #d32f2f);
  border: none;
  color: white;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(255, 82, 82, 0.3);

  &:active {
    transform: translateY(2px);
    box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 82, 82, 0.4);
  }

  -webkit-tap-highlight-color: transparent;
`;

export default Buzzer;
