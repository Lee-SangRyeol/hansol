import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import styled from "styled-components";
import { useSession } from "next-auth/react";
import { colors, fonts } from "@/constants";
import StateMessage from "@/components/common/StateMessage";

interface Candidate {
  _id: string;
  name: string;
}

let socket: Socket | null = null;

const Roulette = () => {
  const { data: session } = useSession();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
      });
    }

    socket.emit("roulette_candidates_request");
    socket.on("roulette_candidates", (data: Candidate[]) => {
      setCandidates(data);
      setLoadError("");
    });
    socket.on("roulette_result", (payload: { winner: Candidate | null }) => {
      setWinner(payload.winner ?? null);
    });

    return () => {
      socket?.off("roulette_candidates");
      socket?.off("roulette_result");
    };
  }, []);

  const handleSpin = () => {
    if (session?.user?.role !== "admin" || !socket) return;
    socket.emit("roulette_spin_request");
  };

  return (
    <Container>
      <Card>
        <Title>룰렛 후보</Title>
        <CandidateList>
          {loadError ? (
            <StateMessage title="문제가 발생했어요" description={loadError} />
          ) : candidates.length ? (
            candidates.map((candidate) => (
              <CandidateItem key={candidate._id}>{candidate.name}</CandidateItem>
            ))
          ) : (
            <EmptyText>남은 후보가 없습니다.</EmptyText>
          )}
        </CandidateList>

        {winner && (
          <WinnerBox>
            <WinnerLabel>당첨 단짝</WinnerLabel>
            <WinnerName>{winner.name}</WinnerName>
          </WinnerBox>
        )}

        {session?.user?.role === "admin" && (
          <SpinButton onClick={handleSpin} disabled={!candidates.length}>
            룰렛 돌리기
          </SpinButton>
        )}
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

const Title = styled.h2`
  margin: 0 0 12px;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
`;

const CandidateList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CandidateItem = styled.div`
  border-radius: 999px;
  background: ${colors.grayscale.$10};
  padding: 8px 12px;
  font-family: ${fonts.pretendard.$600};
`;

const EmptyText = styled.div`
  color: ${colors.grayscale.$06};
  font-family: ${fonts.pretendard.$500};
`;

const WinnerBox = styled.div`
  margin-top: 16px;
  border-radius: 12px;
  padding: 12px;
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
`;

const WinnerLabel = styled.div`
  font-family: ${fonts.pretendard.$400};
  opacity: 0.9;
`;

const WinnerName = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 22px;
  margin-top: 2px;
`;

const SpinButton = styled.button`
  margin-top: 14px;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: ${colors.secondary.black};
  color: ${colors.secondary.white};
  font-family: ${fonts.pretendard.$600};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default Roulette;
