import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { colors, fonts } from "@/constants";
import StateMessage from "@/components/common/StateMessage";

interface Question {
  _id: string;
  number: number;
  text: string;
  category: string;
}

interface QuestionState {
  category: string;
  index: number;
  text: string;
}

let socket: Socket | null = null;

const QuestionBoard = () => {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [state, setState] = useState<QuestionState>({
    category: "",
    index: 0,
    text: "",
  });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/questions");
        if (!response.ok) {
          setLoadError("문제 목록을 불러오지 못했어요.");
          return;
        }
        const data = await response.json();
        setQuestions(data.questions ?? []);
        setLoadError("");
      } catch (error) {
        console.error("Question fetch failed:", error);
        setLoadError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
      });
    }

    socket.on("question_state", (payload: QuestionState) => {
      setState(payload);
    });

    return () => {
      socket?.off("question_state");
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(questions.map((question) => question.category))).filter(Boolean),
    [questions]
  );

  const isAdmin = session?.user?.role === "admin";

  const selectCategory = (category: string) => {
    if (!isAdmin || !socket) return;
    socket.emit("question_select_category", category);
  };

  const goPrev = () => {
    if (!isAdmin || !socket) return;
    socket.emit("question_prev");
  };

  const goNext = () => {
    if (!isAdmin || !socket) return;
    socket.emit("question_next");
  };

  return (
    <Container>
      <Card>
        <HeaderRow>
          <Title>문제 탭</Title>
          <RoleText>{isAdmin ? "관리자 조작 가능" : "읽기 전용"}</RoleText>
        </HeaderRow>

        <CategoryWrap>
          {loadError ? (
            <StateMessage title="문제가 발생했어요" description={loadError} />
          ) : null}
          {!loadError && !categories.length ? (
            <StateMessage title="등록된 주제가 없어요" description="관리자가 문제를 먼저 등록해 주세요." />
          ) : null}
          {categories.map((category) => (
            <CategoryButton
              key={category}
              onClick={() => selectCategory(category)}
              disabled={!isAdmin}
              $active={state.category === category}
            >
              {category}
            </CategoryButton>
          ))}
        </CategoryWrap>

        <QuestionBox>
          <QuestionLabel>
            {state.category ? `${state.category} / ${state.index + 1}번` : "주제를 선택해 주세요"}
          </QuestionLabel>
          <QuestionText>{state.text || "문제가 아직 선택되지 않았습니다."}</QuestionText>
        </QuestionBox>

        <ControlRow>
          <ControlButton onClick={goPrev} disabled={!isAdmin}>
            이전 문제
          </ControlButton>
          <ControlButton onClick={goNext} disabled={!isAdmin}>
            다음 문제
          </ControlButton>
        </ControlRow>
      </Card>
    </Container>
  );
};

const Container = styled.div`
  padding: 16px;
`;

const Card = styled.div`
  background: ${colors.secondary.white};
  border-radius: 16px;
  padding: 16px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
`;

const RoleText = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$06};
`;

const CategoryWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const CategoryButton = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  font-family: ${fonts.pretendard.$600};
  background: ${(props) => (props.$active ? colors.primary.$01 : colors.grayscale.$10)};
  color: ${(props) => (props.$active ? colors.secondary.white : colors.secondary.black)};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const QuestionBox = styled.div`
  margin-top: 14px;
  border-radius: 12px;
  background: ${colors.grayscale.$10};
  padding: 14px;
  min-height: 160px;
`;

const QuestionLabel = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$06};
`;

const QuestionText = styled.div`
  margin-top: 8px;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 24px;
  line-height: 1.35;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
`;

const ControlButton = styled.button`
  flex: 1;
  border: none;
  border-radius: 12px;
  height: 44px;
  font-family: ${fonts.pretendard.$600};
  background: ${colors.secondary.black};
  color: ${colors.secondary.white};
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export default QuestionBoard;
