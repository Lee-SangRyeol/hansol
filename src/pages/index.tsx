import { useEffect, useState } from "react";
import styled from "styled-components";
import Layout from "../components/layout/layout";
import { ReactElement } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { colors, fonts } from "@/constants";
import StateMessage from "@/components/common/StateMessage";
import { signInKakaoAppFirst } from "@/lib/kakaoAuth";
import { RiKakaoTalkFill } from "react-icons/ri";
let socket: Socket;

interface MeResponse {
  id: string;
  name: string;
  image?: string;
  onboardingCompleted: boolean;
  friendId?: string | null;
  friend: {
    id: string;
    name: string;
    totalScore: number;
  } | null;
  partner: {
    id: string;
    name: string;
    image?: string;
  } | null;
}

const Index = () => {
  const router = useRouter();
  const { status } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [matchingTextStep, setMatchingTextStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMatchingTextStep((prev) => (prev + 1) % 4);
    }, 800);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const routeByOnboardingStatus = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          setLoadError("사용자 정보를 불러오지 못했어요.");
          return;
        }

        const meData = (await response.json()) as MeResponse;
        if (!meData.onboardingCompleted) {
          router.replace("/onboarding");
          return;
        }
        setMe(meData);
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        setLoadError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
      } finally {
        setIsChecking(false);
      }
    };

    routeByOnboardingStatus();
  }, [status, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setIsChecking(false);
      setMe(null);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    socket = io({
      path: "/api/socket",
    });

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
    });
    return () => {
      socket.disconnect();
    };
  }, [status]);

  if (status === "loading" || (status === "authenticated" && isChecking)) {
    return (
      <BackgroundWrapper>
        <HomeCard>
          <StateMessage
            title="불러오는 중..."
            description="홈 상태를 확인하고 있어요."
          />
        </HomeCard>
      </BackgroundWrapper>
    );
  }

  if (status === "unauthenticated") {
    return (
      <BackgroundWrapper>
        <HomeCard>
          <CenterBox>
            <MainTitle>코람엠티</MainTitle>
            <SubText>카카오 로그인 후 단짝 상태를 확인할 수 있어요.</SubText>
            <KakaoButton onClick={() => signInKakaoAppFirst("/")}>
              <RiKakaoTalkFill size={20} />
              카카오 로그인
            </KakaoButton>
          </CenterBox>
        </HomeCard>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <HomeCard>
        {loadError ? (
          <StateMessage title="문제가 발생했어요" description={loadError} />
        ) : null}
        {!me?.friendId || !me.friend ? (
          <WaitingScene>
            <WaitingImageCenter>
              <Image
                src="/pngs/kid.png"
                alt="단짝 매칭 대기 캐릭터"
                width={280}
                height={160}
                priority
              />
            </WaitingImageCenter>
            <WaitingTextCard>
              <StatusLabel>단짝 매칭중</StatusLabel>
              <MainTitle>{`단짝 매칭중${MATCHING_STATES[matchingTextStep]}`}</MainTitle>
              <SubText>짱친 찾아 삼만리~</SubText>
            </WaitingTextCard>
          </WaitingScene>
        ) : (
          <>
            <StatusLabel>단짝 매칭 완료</StatusLabel>
            <MainTitle>{me.friend.name}</MainTitle>
            <ProfileRow>
              <ProfileBox>
                <Avatar>{me.name?.[0] ?? "나"}</Avatar>
                <ProfileName>{me.name}</ProfileName>
              </ProfileBox>
              <ProfileBox>
                <Avatar>{me.partner?.name?.[0] ?? "짝"}</Avatar>
                <ProfileName>{me.partner?.name ?? "단짝"}</ProfileName>
              </ProfileBox>
            </ProfileRow>
            <ScoreCard>
              <ScoreLabel>팀 점수</ScoreLabel>
              <ScoreValue>{me.friend.totalScore}</ScoreValue>
            </ScoreCard>
          </>
        )}
      </HomeCard>
    </BackgroundWrapper>
  );
};

const BackgroundWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 50px);
  background: ${colors.secondary.$01};
  padding: 24px;
`;

const HomeCard = styled.div`
  width: 100%;
  max-width: 560px;
  border-radius: 24px;
  padding: 28px;
  background: ${colors.secondary.white};
  box-shadow: 0 16px 40px rgba(25, 25, 25, 0.12);
  display: flex;
  flex-direction: column;
`;

const StatusLabel = styled.div`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${colors.primary.$01};
`;

const MainTitle = styled.h1`
  margin: 8px 0 12px;
  font-family: ${fonts.pretendard.$700};
  font-size: 30px;
  color: ${colors.secondary.black};
`;

const WaitingImageCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const WaitingTextCard = styled.div`
  margin-top: 12px;
  border-radius: 16px;
  background: ${colors.grayscale.$10};
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const WaitingScene = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const SubText = styled.p`
  margin: 0;
  font-family: ${fonts.pretendard.$400};
  color: ${colors.grayscale.$05};
  line-height: 1.5;
`;

const ProfileRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const ProfileBox = styled.div`
  flex: 1;
  border-radius: 16px;
  background: ${colors.grayscale.$10};
  padding: 16px;
  text-align: center;
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 10px;
  border-radius: 28px;
  background: ${colors.primary.$02};
  color: ${colors.secondary.white};
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: ${fonts.pretendard.$700};
  font-size: 24px;
`;

const ProfileName = styled.div`
  font-family: ${fonts.pretendard.$600};
  color: ${colors.secondary.black};
`;

const ScoreCard = styled.div`
  margin-top: 14px;
  border-radius: 16px;
  padding: 16px;
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
`;

const ScoreLabel = styled.div`
  font-family: ${fonts.pretendard.$400};
  opacity: 0.9;
`;

const ScoreValue = styled.div`
  margin-top: 4px;
  font-family: ${fonts.pretendard.$700};
  font-size: 34px;
`;

const CenterBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
`;

const KakaoButton = styled.button`
  margin-top: 10px;
  border: none;
  border-radius: 12px;
  height: 48px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fee500;
  color: #191919;
  font-family: ${fonts.pretendard.$700};
  font-size: 16px;
  cursor: pointer;
`;

const MATCHING_STATES = ["..", "...", "....", "....❤️"];

Index.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export async function getServerSideProps() {
  try {
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();
    console.log("성공적으로 DB에 연결이 완료되었습니다");
  } catch (error) {
    console.error("DB 연결 실패:", error);
  }
  return { props: {} };
}

export default Index;
