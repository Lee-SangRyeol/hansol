import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Layout from "../components/layout/layout";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { colors, fonts } from "@/constants";
import StateMessage from "@/components/common/StateMessage";
import { signInKakaoAppFirst } from "@/lib/kakaoAuth";
import { RiKakaoTalkFill } from "react-icons/ri";
import { IoClose } from "react-icons/io5";
import type { CSSProperties, MouseEvent, ReactElement } from "react";

let socket: Socket;

const blockImageSystemMenu = (event: MouseEvent<HTMLImageElement>): void => {
  event.preventDefault();
};

const avatarImageStyle = {
  borderRadius: "20px",
  objectFit: "cover" as const,
  WebkitTouchCallout: "none" as const,
  WebkitUserSelect: "none" as const,
  userSelect: "none" as const,
};

/** 화면 좌측 상단 고정 로고 크기 */
const homeCoramLogoStyle: CSSProperties = {
  width: "auto",
  height: "clamp(128px, 34vw, 160px)",
  maxWidth: "min(500px, 60vw)",
  objectFit: "contain",
};

const SECRET_PROFILE_TAP_GOAL = 20;
const SECRET_TAP_RESET_MS = 2800;

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
    prayerTopic?: string;
    tmi?: string;
  } | null;
}

const Index = () => {
  const router = useRouter();
  const { status } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [matchingTextStep, setMatchingTextStep] = useState(0);
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [partnerTmiOpen, setPartnerTmiOpen] = useState(false);
  const isWaiting = !me?.friendId || !me.friend;

  const secretTapCountRef = useRef(0);
  const secretTapResetTimerRef = useRef<number | null>(null);

  const bumpPartnerProfileTap = () => {
    if (!me?.partner) return;
    if (secretTapResetTimerRef.current) {
      window.clearTimeout(secretTapResetTimerRef.current);
      secretTapResetTimerRef.current = null;
    }
    secretTapCountRef.current += 1;
    if (secretTapCountRef.current >= SECRET_PROFILE_TAP_GOAL) {
      secretTapCountRef.current = 0;
      setSecretModalOpen(true);
      return;
    }
    secretTapResetTimerRef.current = window.setTimeout(() => {
      secretTapCountRef.current = 0;
      secretTapResetTimerRef.current = null;
    }, SECRET_TAP_RESET_MS);
  };

  useEffect(
    () => () => {
      if (secretTapResetTimerRef.current) {
        window.clearTimeout(secretTapResetTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    setPartnerTmiOpen(false);
  }, [me?.partner?.id]);

  useEffect(() => {
    secretTapCountRef.current = 0;
    if (secretTapResetTimerRef.current) {
      window.clearTimeout(secretTapResetTimerRef.current);
      secretTapResetTimerRef.current = null;
    }
  }, [isWaiting]);

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
      <>
        <FixedCornerLogo>
          <Image
            src="/pngs/Group 6.png"
            alt="CORAM DEO"
            width={500}
            height={100}
            sizes="(max-width: 500px) 60vw, 400px"
            draggable={false}
            style={{ ...homeCoramLogoStyle, pointerEvents: "none" }}
          />
        </FixedCornerLogo>
        <BackgroundWrapper>
          <HomeVerticalStack>
            <HomeCard $isWaiting={false}>
              <StateMessage
                title="불러오는 중..."
                description="홈 상태를 확인하고 있어요."
              />
            </HomeCard>
          </HomeVerticalStack>
        </BackgroundWrapper>
      </>
    );
  }

  if (status === "unauthenticated") {
    return (
      <>
        <FixedCornerLogo>
          <Image
            src="/pngs/Group 6.png"
            alt="CORAM DEO"
            width={500}
            height={100}
            sizes="(max-width: 500px) 60vw, 400px"
            draggable={false}
            style={{ ...homeCoramLogoStyle, pointerEvents: "none" }}
          />
        </FixedCornerLogo>
        <BackgroundWrapper>
          <HomeVerticalStack>
            <HomeCard $isWaiting={false}>
              <CenterBox>
                <MainTitle>코람엠티</MainTitle>
                <SubText>
                  카카오 로그인 후 단짝 상태를 확인할 수 있어요.
                </SubText>
                <KakaoButton onClick={() => signInKakaoAppFirst("/")}>
                  <RiKakaoTalkFill size={20} />
                  카카오 로그인
                </KakaoButton>
              </CenterBox>
            </HomeCard>
          </HomeVerticalStack>
        </BackgroundWrapper>
      </>
    );
  }

  return (
    <>
      <FixedCornerLogo>
        <Image
          src="/pngs/Group 6.png"
          alt="CORAM DEO"
          width={500}
          height={100}
          sizes="(max-width: 500px) 60vw, 400px"
          draggable={false}
          priority
          style={{ ...homeCoramLogoStyle, pointerEvents: "none" }}
        />
      </FixedCornerLogo>
      <BackgroundWrapper>
        <HomeVerticalStack>
          <HomeCard $isWaiting={isWaiting}>
            {loadError ? (
              <StateMessage title="문제가 발생했어요" description={loadError} />
            ) : null}
            {isWaiting ? (
              <WaitingScene>
                <WaitingImageCenter>
                  <Image
                    src="/pngs/kid.png"
                    alt="단짝 매칭 대기 캐릭터"
                    width={300}
                    height={300}
                    priority
                    draggable={false}
                    style={{
                      WebkitTouchCallout: "none",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                    }}
                    onContextMenu={blockImageSystemMenu}
                  />
                </WaitingImageCenter>
                <WaitingTextCard>
                  <StatusLabel>단짝 매칭중</StatusLabel>
                  <MainTitle>{`단짝 매칭중${MATCHING_STATES[matchingTextStep]}`}</MainTitle>
                  <SubText>짱친 찾아 삼만리~</SubText>
                </WaitingTextCard>
              </WaitingScene>
            ) : (
              <MatchedScene>
                <MatchedSceneTopBar>
                  <StatusLabel $shrinkTitle>단짝 매칭 완료</StatusLabel>
                  {me.partner ? (
                    <TmiToggleButton
                      type="button"
                      aria-expanded={partnerTmiOpen}
                      aria-controls="partner-tmi-panel"
                      onClick={() => setPartnerTmiOpen((previous) => !previous)}
                    >
                      TMI
                    </TmiToggleButton>
                  ) : null}
                </MatchedSceneTopBar>
                <MatchedImageRow>
                  <MatchedImageFrame role="presentation">
                    {me.image ? (
                      <Image
                        src={me.image}
                        alt={`${me.name} 프로필`}
                        width={132}
                        height={132}
                        style={avatarImageStyle}
                        draggable={false}
                        onContextMenu={blockImageSystemMenu}
                      />
                    ) : (
                      <FallbackBox>NO IMAGE</FallbackBox>
                    )}
                  </MatchedImageFrame>
                  <MatchedImageFrame
                    role="presentation"
                    onClick={bumpPartnerProfileTap}
                  >
                    {me.partner?.image ? (
                      <Image
                        src={me.partner.image}
                        alt={`${me.partner?.name ?? "단짝"} 프로필`}
                        width={132}
                        height={132}
                        style={avatarImageStyle}
                        draggable={false}
                        onContextMenu={blockImageSystemMenu}
                      />
                    ) : (
                      <FallbackBox>NO IMAGE</FallbackBox>
                    )}
                  </MatchedImageFrame>
                </MatchedImageRow>
                <MatchedNames>{`${me.name} ---- ❤️ ---- ${
                  me.partner?.name ?? "단짝"
                }`}</MatchedNames>
                <ScoreInline>
                  <ScoreInlineLabel>짱친 점수</ScoreInlineLabel>
                  <ScoreInlineValue>{me.friend!.totalScore}</ScoreInlineValue>
                </ScoreInline>
              </MatchedScene>
            )}
          </HomeCard>
        </HomeVerticalStack>
      </BackgroundWrapper>

      {partnerTmiOpen && me?.partner ? (
        <PartnerTmiFloatShell
          id="partner-tmi-panel"
          role="region"
          aria-label={`${me.partner.name} 님의 최근 TMI`}
        >
          <PartnerTmiKicker>{me.partner.name} 님의 TMI</PartnerTmiKicker>
          <PartnerTmiFloatScroll>
            <PartnerTmiText>
              {me.partner.tmi?.trim()
                ? me.partner.tmi.trim()
                : "아직 TMI를 남기지 않았어요."}
            </PartnerTmiText>
          </PartnerTmiFloatScroll>
        </PartnerTmiFloatShell>
      ) : null}

      {secretModalOpen && me?.partner ? (
        <SecretModalBackdrop role="presentation">
          <SecretModalCard
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-prayer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <SecretModalX
              type="button"
              aria-label="닫기"
              onClick={() => setSecretModalOpen(false)}
            >
              <IoClose size={22} aria-hidden />
            </SecretModalX>
            <SecretModalHeader>
              <SecretModalKicker>기도제목</SecretModalKicker>
              <SecretModalTitle id="partner-prayer-title">
                {me.partner.name}.
              </SecretModalTitle>
            </SecretModalHeader>
            <SecretModalBodyShell>
              <SecretModalBody $empty={!me.partner.prayerTopic?.trim()}>
                {me.partner.prayerTopic?.trim()
                  ? me.partner.prayerTopic.trim()
                  : "등록된 기도제목이 없어요."}
              </SecretModalBody>
            </SecretModalBodyShell>
          </SecretModalCard>
        </SecretModalBackdrop>
      ) : null}
    </>
  );
};

const BackgroundWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 50px);
  padding: 12px 24px 24px;
  box-sizing: border-box;
  background: ${colors.secondary.$01};
`;

const HomeVerticalStack = styled.div`
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const FixedCornerLogo = styled.div`
  position: fixed;
  top: max(12px, env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  pointer-events: none;
`;

const HomeCard = styled.div<{ $isWaiting: boolean }>`
  width: 100%;
  max-width: 560px;
  border-radius: 24px;
  padding: ${(props) => (props.$isWaiting ? "0" : "28px")};
  background: ${(props) =>
    props.$isWaiting ? "transparent" : colors.secondary.white};
  box-shadow: ${(props) =>
    props.$isWaiting ? "none" : "0 16px 40px rgba(25, 25, 25, 0.12)"};
  display: flex;
  flex-direction: column;
  overflow: visible;
`;

const StatusLabel = styled.div<{ $shrinkTitle?: boolean }>`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: ${colors.primary.$01};
  ${(p) =>
    p.$shrinkTitle &&
    `
    flex: 1;
    min-width: 0;
  `}
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
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
`;

const WaitingTextCard = styled.div`
  margin-top: 12px;
  border-radius: 16px;
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

const MatchedScene = styled.div`
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
`;

const MatchedSceneTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  flex-shrink: 0;
`;

const TmiToggleButton = styled.button`
  flex-shrink: 0;
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${colors.grayscale.$09};
  background: ${colors.secondary.white};
  box-shadow: 0 6px 16px rgba(25, 25, 25, 0.08);
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  letter-spacing: 0.04em;
  color: ${colors.primary.$01};
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 2px solid ${colors.primary.$02};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const PartnerTmiFloatShell = styled.div`
  position: fixed;
  top: max(108px, calc(env(safe-area-inset-top, 0px) + 92px));
  right: calc(14px + env(safe-area-inset-right, 0px));
  left: auto;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px 20px;
  width: min(
    300px,
    calc(
      100vw - 28px - env(safe-area-inset-left, 0px) -
        env(safe-area-inset-right, 0px)
    )
  );
  border-radius: 20px;
  background: linear-gradient(
    165deg,
    ${colors.secondary.white} 0%,
    ${colors.secondary.$01} 52%,
    ${colors.grayscale.$11} 100%
  );
  border: 1px solid ${colors.grayscale.$09};
  box-shadow: 0 12px 32px rgba(25, 25, 25, 0.14);
  box-sizing: border-box;
  max-height: min(40vh, 300px);

  &::after {
    content: "";
    position: absolute;
    left: -7px;
    top: 70%;
    transform: translateY(-50%) rotate(45deg);
    width: 14px;
    height: 14px;
    background: linear-gradient(
      135deg,
      ${colors.secondary.$01} 45%,
      ${colors.grayscale.$11} 100%
    );
    border-left: 1px solid ${colors.grayscale.$09};
    border-bottom: 1px solid ${colors.grayscale.$09};
    border-radius: 0 0 0 3px;
    box-sizing: border-box;
  }
`;

const PartnerTmiFloatScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const PartnerTmiKicker = styled.p`
  margin: 0;
  flex-shrink: 0;
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  letter-spacing: -0.01em;
  color: ${colors.primary.$01};
`;

const PartnerTmiText = styled.p`
  margin: 0;
  font-family: ${fonts.pretendard.$500};
  font-size: clamp(15px, 4vw, 17px);
  line-height: 1.65;
  color: ${colors.grayscale.$02};
  white-space: pre-wrap;
  word-break: keep-all;
`;

const MatchedImageRow = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 14px;
  margin-top: 14px;
`;

const MatchedImageFrame = styled.div`
  width: 132px;
  height: 132px;
  border-radius: 20px;
  border: 2px solid ${colors.grayscale.$09};
  background: ${colors.secondary.white};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
`;

const FallbackBox = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${fonts.pretendard.$600};
  font-size: 12px;
  color: ${colors.grayscale.$06};
  background: ${colors.grayscale.$10};
`;

const MatchedNames = styled.div`
  margin-top: 16px;
  text-align: center;
  font-family: ${fonts.pretendard.$700};
  font-size: 24px;
  color: ${colors.secondary.black};
`;

const ScoreInline = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
`;

const ScoreInlineLabel = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$06};
  font-size: 18px;
`;

const ScoreInlineValue = styled.div`
  font-family: ${fonts.pretendard.$700};
  font-size: 38px;
  color: ${colors.primary.$01};
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

const SecretModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(25, 25, 25, 0.48);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const SecretModalCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 392px;
  border-radius: 24px;
  padding: 28px 22px 24px;
  background: ${colors.secondary.white};
  box-shadow: 0 28px 72px rgba(25, 25, 25, 0.22),
    0 0 0 1px rgba(104, 80, 251, 0.06);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    border: 1px solid rgba(222, 223, 225, 0.9);
  }
`;

const SecretModalHeader = styled.div`
  padding-right: 48px;
  margin-bottom: 18px;
`;

const SecretModalKicker = styled.p`
  margin: 0 0 10px;
  font-family: ${fonts.pretendard.$600};
  font-size: 13px;
  letter-spacing: -0.01em;
  color: ${colors.primary.$01};
`;

const SecretModalTitle = styled.h2`
  margin: 0;
  font-family: ${fonts.pretendard.$700};
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: ${colors.secondary.black};
`;

const SecretModalX = styled.button`
  position: absolute;
  top: 18px;
  right: 16px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: ${colors.grayscale.$11};
  color: ${colors.grayscale.$03};
  cursor: pointer;

  &:hover {
    background: ${colors.grayscale.$10};
    color: ${colors.secondary.black};
  }

  &:active {
    background: ${colors.grayscale.$09};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary.$02};
    outline-offset: 2px;
  }
`;

const SecretModalBodyShell = styled.div`
  padding: 20px 18px;
  border-radius: 18px;
  border: 1px solid ${colors.grayscale.$09};
  border-left: 4px solid ${colors.primary.$01};
  background: linear-gradient(
    160deg,
    ${colors.secondary.$01} 0%,
    ${colors.secondary.white} 48%,
    ${colors.grayscale.$11} 100%
  );
  max-height: min(52vh, 288px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

const SecretModalBody = styled.p<{ $empty?: boolean }>`
  margin: 0;
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  line-height: 1.7;
  color: ${(p) => (p.$empty ? colors.grayscale.$06 : colors.grayscale.$02)};
  font-style: ${(p) => (p.$empty ? "italic" : "normal")};
  white-space: pre-wrap;
  word-break: break-word;
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
