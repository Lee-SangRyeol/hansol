import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import styled from "styled-components";
import { useSession } from "next-auth/react";
import { colors, fonts } from "@/constants";
import StateMessage from "@/components/common/StateMessage";
import {
  buildRouletteLandingSequence,
  splitSpinDurationsEaseOut,
} from "@/lib/rouletteSpinClient";

interface Candidate {
  _id: string;
  name: string;
}

interface SpinAnimationPayload {
  candidates: Candidate[];
  winnerId: string;
  spinDurationMs: number;
}

let socket: Socket | null = null;

function findWinnerIndex(items: Candidate[], winnerId: string): number {
  const indexFound = items.findIndex((candidate) => candidate._id === winnerId);
  return indexFound >= 0 ? indexFound : 0;
}

const Roulette = () => {
  const { data: session } = useSession();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [loadError, setLoadError] = useState("");
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const timeoutIdsRef = useRef<number[]>([]);
  const spinGenerationRef = useRef(0);
  const isSpinningRef = useRef(false);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  const clearSpinTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId)
    );
    timeoutIdsRef.current = [];
  }, []);

  const cancelLocalSpinVisual = useCallback(() => {
    spinGenerationRef.current += 1;
    clearSpinTimeouts();
    setIsSpinning(false);
    setHighlightIndex(null);
    setWinner(null);
  }, [clearSpinTimeouts]);

  useEffect(() => {
    if (!socket) {
      socket = io({
        path: "/api/socket",
        transports: ["websocket", "polling"],
      });
    }

    const runLandingAnimation = (payload: SpinAnimationPayload) => {
      clearSpinTimeouts();
      spinGenerationRef.current += 1;
      const generation = spinGenerationRef.current;

      const list = payload.candidates;
      if (!list.length) return;

      if (list.length === 1) {
        setCandidates(list);
        setWinner(null);
        setHighlightIndex(0);
        setIsSpinning(true);
        const singleTimeoutId = window.setTimeout(() => {
          if (spinGenerationRef.current !== generation) return;
          setIsSpinning(false);
          setHighlightIndex(null);
          setWinner(list[0]);
        }, Math.min(payload.spinDurationMs, 2400));
        timeoutIdsRef.current.push(singleTimeoutId);
        return;
      }

      const winnerIdx = findWinnerIndex(list, payload.winnerId);
      const sequence = buildRouletteLandingSequence(
        list.length,
        winnerIdx,
        Math.min(48, Math.max(28, list.length * 4))
      );

      const transitionCount = sequence.length - 1;
      const stepMs = splitSpinDurationsEaseOut(
        transitionCount,
        payload.spinDurationMs
      );

      setCandidates(list);
      setWinner(null);
      setIsSpinning(true);
      setHighlightIndex(sequence[0] ?? null);

      if (transitionCount <= 0) {
        setIsSpinning(false);
        setHighlightIndex(null);
        const resolved = list[winnerIdx];
        if (resolved) setWinner(resolved);
        return;
      }

      let accumulated = 0;
      for (
        let stepPointer = 0;
        stepPointer < transitionCount;
        stepPointer += 1
      ) {
        accumulated += stepMs[stepPointer];
        const nextCandidateIndex = sequence[stepPointer + 1];
        const fireAt = accumulated;
        const timeoutId = window.setTimeout(() => {
          if (spinGenerationRef.current !== generation) return;
          setHighlightIndex(nextCandidateIndex);
          if (stepPointer === transitionCount - 1) {
            setIsSpinning(false);
            setHighlightIndex(null);
            const resolved = list[winnerIdx];
            if (resolved) setWinner(resolved);
          }
        }, fireAt);
        timeoutIdsRef.current.push(timeoutId);
      }
    };

    socket.emit("roulette_candidates_request");

    socket.on("roulette_candidates", (data: Candidate[]) => {
      setCandidates(data);
      setLoadError("");
      if (!isSpinningRef.current) {
        setHighlightIndex(null);
      }
    });

    socket.on("roulette_result", (payload: { winner: Candidate | null }) => {
      clearSpinTimeouts();
      setIsSpinning(false);
      setHighlightIndex(null);
      setWinner(payload.winner ?? null);
    });

    socket.on("roulette_spin_animation", (payload: SpinAnimationPayload) => {
      if (!payload?.candidates?.length) return;
      runLandingAnimation(payload);
    });

    socket.on("roulette_reset", () => {
      cancelLocalSpinVisual();
    });

    return () => {
      clearSpinTimeouts();
      socket?.off("roulette_candidates");
      socket?.off("roulette_result");
      socket?.off("roulette_spin_animation");
      socket?.off("roulette_reset");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket listeners mount once per mount
  }, []);

  const handleSpin = () => {
    if (session?.user?.role !== "admin" || !socket) return;
    socket.emit("roulette_spin_request");
  };

  return (
    <Container>
      <Card>
        <Title>룰렛</Title>
        <WheelArea>
          {loadError ? (
            <StateMessage title="문제가 발생했어요" description={loadError} />
          ) : candidates.length ? (
            <WheelTrack>
              {candidates.map((candidate, index) => {
                const isActive = highlightIndex === index;
                return (
                  <WheelCell
                    key={candidate._id}
                    $active={isActive}
                    animate={
                      isActive
                        ? { scale: 1.06, opacity: 1, y: 0 }
                        : { scale: 0.96, opacity: 0.62, y: isSpinning ? 2 : 0 }
                    }
                    transition={{
                      duration: isSpinning ? 0.09 : 0.32,
                      ease: isSpinning ? "linear" : [0.17, 0.67, 0.25, 1],
                    }}
                  >
                    {candidate.name}
                  </WheelCell>
                );
              })}
            </WheelTrack>
          ) : (
            <EmptyText>남은 후보가 없습니다.</EmptyText>
          )}
        </WheelArea>

        {winner && (
          <WinnerBox>
            <WinnerName>{winner.name}</WinnerName>
          </WinnerBox>
        )}

        {session?.user?.role === "admin" && (
          <SpinButton
            onClick={handleSpin}
            disabled={!candidates.length || isSpinning}
          >
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

const WheelArea = styled.div`
  position: relative;
`;

const SpinningBadge = styled.div`
  position: absolute;
  top: -6px;
  right: -4px;
  font-family: ${fonts.pretendard.$600};
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(104, 80, 251, 0.15);
  color: ${colors.primary.$01};
`;

const WheelTrack = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const WheelCell = styled(motion.div)<{ $active?: boolean }>`
  flex: 1 1 calc(50% - 4px);
  min-width: min(148px, calc(50% - 4px));
  border-radius: 14px;
  border: 2px solid
    ${(props) => (props.$active ? colors.primary.$01 : colors.grayscale.$09)};
  background: ${(props) =>
    props.$active ? colors.secondary.$01 : colors.grayscale.$11};
  padding: 12px 10px;
  font-family: ${fonts.pretendard.$700};
  font-size: 14px;
  text-align: center;
  color: ${colors.secondary.black};
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${(props) =>
    props.$active
      ? `0 6px 18px rgba(104, 80, 251, 0.28)`
      : "0 2px 8px rgba(25, 25, 25, 0.06)"};
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
