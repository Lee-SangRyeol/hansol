import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import BlackboardModal from "./BlackboardModal";

interface BlackboardItem {
  id: string;
  type: "text" | "image" | "game";
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  timestamp: Date;
  gameType?: string;
  category?: string;
}

const Blackboard = () => {
  const { data: session } = useSession();
  const [blackboardItems, setBlackboardItems] = useState<BlackboardItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user?.name) return;

    console.log("Session user:", session.user);
    console.log("User role:", session.user.role);
    setIsAdmin(session?.user?.role === "admin");

    // 소켓 연결
    if (!socketRef.current) {
      console.log("Connecting to socket...");
      socketRef.current = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current.on("connect", () => {
        console.log("Socket connected:", socketRef.current?.id);
        setIsConnected(true);
      });

      socketRef.current.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      socketRef.current.on("blackboard_items", (items: BlackboardItem[]) => {
        console.log("Received blackboard items:", items);
        setBlackboardItems(items);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });

      // 모든 이벤트를 로그로 확인
      socketRef.current.onAny((eventName, ...args) => {
        console.log("Socket event received:", eventName, args);
      });
    }

    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket...");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [session?.user?.name, session?.user?.role]);

  const handleAddGameContent = (
    gameType: string,
    category: string,
    content: string
  ) => {
    if (socketRef.current) {
      console.log("Adding game content:", { gameType, category, content });
      const newItem: Omit<BlackboardItem, "id" | "timestamp"> = {
        type: "game",
        content,
        position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
        size: { width: 300, height: 100 },
        gameType,
        category,
      };
      console.log("Emitting add_blackboard_item:", newItem);
      socketRef.current.emit("add_blackboard_item", newItem);
      setShowModal(false);
    } else {
      console.error("Socket not connected");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (socketRef.current) {
      console.log("Deleting item:", itemId);
      socketRef.current.emit("delete_blackboard_item", itemId);
    }
  };

  const handleClearAll = () => {
    if (socketRef.current) {
      console.log("Clearing all items");
      socketRef.current.emit("clear_blackboard");
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    if (!isAdmin) return;
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin || !draggedItem || !socketRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log("Updating item position:", draggedItem, { x, y });
    socketRef.current.emit("update_blackboard_item", draggedItem, {
      position: { x, y },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const renderBlackboardItem = (item: BlackboardItem) => {
    if (item.type === "game") {
      return (
        <GameContent>
          <GameType>{item.gameType}</GameType>
          <GameCategory>{item.category}</GameCategory>
          <GameText>{item.content}</GameText>
        </GameContent>
      );
    } else if (item.type === "image") {
      return <ImageContent src={item.content} alt="Blackboard image" />;
    } else {
      return <TextContent>{item.content}</TextContent>;
    }
  };

  const handleTestAdd = () => {
    if (socketRef.current) {
      console.log("Test adding item...");
      const testItem: Omit<BlackboardItem, "id" | "timestamp"> = {
        type: "text",
        content: "테스트 아이템",
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
      };
      socketRef.current.emit("add_blackboard_item", testItem);
    }
  };

  return (
    <Container>
      <TopCard>
        <BlackboardArea
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          $isAdmin={isAdmin}
        >
          {blackboardItems.length === 0 ? (
            <EmptyState>
              <EmptyIcon>📝</EmptyIcon>
              <EmptyText>
                {isAdmin ? "칠판에 내용을 추가해보세요" : "메롱"}
              </EmptyText>
              {isAdmin && (
                <ConnectionStatus $connected={isConnected}>
                  {isConnected ? "연결됨" : "연결 중..."}
                </ConnectionStatus>
              )}
              <DebugInfo>
                <div>관리자: {isAdmin ? "예" : "아니오"}</div>
                <div>연결상태: {isConnected ? "연결됨" : "연결 안됨"}</div>
                <div>아이템 수: {blackboardItems.length}</div>
              </DebugInfo>
            </EmptyState>
          ) : (
            blackboardItems.map((item) => (
              <BlackboardItemWrapper
                key={item.id}
                $position={item.position}
                $size={item.size}
                $isAdmin={isAdmin}
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
              >
                {renderBlackboardItem(item)}
                {isAdmin && (
                  <DeleteButton onClick={() => handleDeleteItem(item.id)}>
                    ✕
                  </DeleteButton>
                )}
              </BlackboardItemWrapper>
            ))
          )}
        </BlackboardArea>
      </TopCard>

      {isAdmin && (
        <BottomCard>
          <AdminControls>
            <ControlButton onClick={() => setShowModal(true)}>
              게임 내용 추가
            </ControlButton>
            <ControlButton onClick={handleTestAdd}>
              테스트 추가
            </ControlButton>
            <ControlButton onClick={handleClearAll} $danger>
              전체 삭제
            </ControlButton>
            <ConnectionStatus $connected={isConnected}>
              {isConnected ? "연결됨" : "연결 중..."}
            </ConnectionStatus>
          </AdminControls>
        </BottomCard>
      )}

      {showModal && (
        <BlackboardModal
          onClose={() => setShowModal(false)}
          onAddContent={handleAddGameContent}
        />
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 85%;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  color: white;
`;

const TopCard = styled.div`
  flex: 1;
  background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  padding: 24px;
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
`;

const BlackboardArea = styled.div<{ $isAdmin: boolean }>`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  cursor: ${(props) => (props.$isAdmin ? "crosshair" : "default")};
  min-height: 400px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
`;

const EmptyText = styled.h3`
  font-family: ${fonts.pretendard.$600};
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 10px 0;
`;

const ConnectionStatus = styled.div<{ $connected: boolean }>`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: ${(props) => (props.$connected ? "#27ae60" : "#e74c3c")};
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid ${(props) => (props.$connected ? "#27ae60" : "#e74c3c")};
`;

const DebugInfo = styled.div`
  margin-top: 20px;
  font-family: ${fonts.pretendard.$500};
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: left;
  
  div {
    margin-bottom: 4px;
  }
`;

const BlackboardItemWrapper = styled.div<{
  $position: { x: number; y: number };
  $size: { width: number; height: number };
  $isAdmin: boolean;
}>`
  position: absolute;
  left: ${(props) => props.$position.x}px;
  top: ${(props) => props.$position.y}px;
  width: ${(props) => props.$size.width}px;
  height: ${(props) => props.$size.height}px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(10px);
  cursor: ${(props) => (props.$isAdmin ? "move" : "default")};
  transition: all 0.2s ease;
  z-index: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.02);
  }
`;

const TextContent = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: white;
  word-wrap: break-word;
  height: 100%;
  overflow: hidden;
`;

const ImageContent = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
`;

const GameContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
`;

const GameType = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 14px;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const GameCategory = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 12px;
  color: #f39c12;
`;

const GameText = styled.div`
  font-family: ${fonts.pretendard.$500};
  font-size: 18px;
  color: white;
  word-wrap: break-word;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
  z-index: 2;

  &:hover {
    background: #c0392b;
    transform: scale(1.1);
  }
`;

const BottomCard = styled.div`
  background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
  border-radius: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AdminControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ControlButton = styled.button<{ $danger?: boolean }>`
  padding: 12px 24px;
  background: ${(props) =>
    props.$danger
      ? "linear-gradient(145deg, #e74c3c, #c0392b)"
      : "linear-gradient(145deg, #667eea, #764ba2)"};
  border: none;
  border-radius: 12px;
  color: white;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default Blackboard;
