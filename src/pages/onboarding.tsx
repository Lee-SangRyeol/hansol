import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import { colors, fonts, CLOSE_FRIEND_OPTIONS } from "@/constants";
import StateMessage from "@/components/common/StateMessage";

const OnboardingPage = () => {
  const router = useRouter();
  const { status } = useSession();

  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    prayerTopic: "",
    closeFriends: ["", "", ""],
    tmi: "",
    bibleVerse: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const bootstrap = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (!response.ok) {
          setErrorMessage("사용자 정보를 불러오지 못했습니다.");
          router.replace("/");
          return;
        }

        const data = await response.json();
        if (data.onboardingCompleted) {
          router.replace("/");
          return;
        }
      } catch (error) {
        console.error("Failed to load onboarding status:", error);
        setErrorMessage("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
        router.replace("/");
        return;
      }
      setLoaded(true);
    };

    bootstrap();
  }, [status, router]);

  const closeFriendOptions = useMemo(
    () =>
      [0, 1, 2].map((index) =>
        CLOSE_FRIEND_OPTIONS.filter(
          (name) =>
            !form.closeFriends.includes(name) ||
            form.closeFriends[index] === name
        )
      ),
    [form.closeFriends]
  );

  const canGoNext = useMemo(() => {
    if (step === 0) return form.prayerTopic.trim().length > 0;
    if (step === 1)
      return (
        form.closeFriends.every((name) => name.trim().length > 0) &&
        new Set(form.closeFriends).size === 3
      );
    if (step === 2) return form.tmi.trim().length > 0;
    if (step === 3) return form.bibleVerse.trim().length > 0;
    return false;
  }, [form, step]);

  const updateCloseFriend = (index: number, value: string) => {
    const next = [...form.closeFriends];
    next[index] = value;
    setForm((prev) => ({ ...prev, closeFriends: next }));
  };

  const handleSubmit = async () => {
    if (!canGoNext || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/users/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error ?? "온보딩 저장 실패");
      }

      router.replace("/");
    } catch (error) {
      console.error("Onboarding submit failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "저장 중 문제가 발생했습니다. 다시 시도해 주세요."
      );
      setIsSaving(false);
    }
  };

  if (status !== "authenticated" || !loaded) {
    return (
      <Container>
        <Card>
          <StateMessage
            title="불러오는 중..."
            description="온보딩 정보를 준비하고 있어요."
          />
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <ProgressText>{step + 1} / 4</ProgressText>
        {errorMessage ? (
          <ErrorText role="alert">{errorMessage}</ErrorText>
        ) : null}

        {step === 0 && (
          <>
            <QuestionTitle>기도제목을 적어주세요</QuestionTitle>
            <Description>
              친한사람 딱 1명에게만 공개할 기도에요.
              <br />
              마음속 깊은 이야기일수록 더 좋은 기도의 동역자가 될 수 있어요.
            </Description>
            <TextArea
              value={form.prayerTopic}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  prayerTopic: event.target.value,
                }))
              }
              placeholder="기도제목을 입력해 주세요"
              maxLength={500}
            />
          </>
        )}

        {step === 1 && (
          <>
            <QuestionTitle>친한사람 3명을 선택해 주세요</QuestionTitle>
            <Description>
              내부 알고리즘에 따라 높은 확률로 이 사람들 중 한 명과 팀이 됩니다.
              <br />
              동성만 선택해 주세요.
            </Description>
            <SelectGroup>
              {[0, 1, 2].map((index) => (
                <SelectRow key={index}>
                  <SelectLabel>{index + 1}</SelectLabel>
                  <Select
                    value={form.closeFriends[index]}
                    onChange={(event) =>
                      updateCloseFriend(index, event.target.value)
                    }
                  >
                    <option value="">선택해 주세요</option>
                    {closeFriendOptions[index].map((name) => (
                      <option key={`${index}-${name}`} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </SelectRow>
              ))}
            </SelectGroup>
          </>
        )}

        {step === 2 && (
          <>
            <QuestionTitle>최근 TMI를 적어주세요</QuestionTitle>
            <Description>
              우울한 이야기보다 재밌는 이야기가 좋아요.
              <br />
              별거 아닌 TMI는 감점될 수 있어요.
            </Description>
            <TextArea
              value={form.tmi}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tmi: event.target.value }))
              }
              placeholder="최근 TMI를 입력해 주세요"
              maxLength={500}
            />
          </>
        )}

        {step === 3 && (
          <>
            <QuestionTitle>은혜받은 성경 구절을 적어주세요</QuestionTitle>
            <Description>
              최근에 은혜받은 구절 또는 평소 좋아하는 구절을 입력해 주세요.
            </Description>
            <TextArea
              value={form.bibleVerse}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bibleVerse: event.target.value }))
              }
              placeholder="성경 구절을 입력해 주세요"
              maxLength={500}
            />
          </>
        )}

        <ButtonRow>
          <GhostButton
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0 || isSaving}
          >
            이전
          </GhostButton>

          {step < 3 ? (
            <PrimaryButton
              onClick={() => setStep((prev) => Math.min(3, prev + 1))}
              disabled={!canGoNext || isSaving}
            >
              다음
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={handleSubmit}
              disabled={!canGoNext || isSaving}
            >
              {isSaving ? "저장 중..." : "완료"}
            </PrimaryButton>
          )}
        </ButtonRow>
      </Card>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.secondary.$01};
  padding: 24px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 560px;
  background: ${colors.secondary.white};
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 16px 40px rgba(25, 25, 25, 0.12);
`;

const ProgressText = styled.div`
  font-family: ${fonts.pretendard.$600};
  color: ${colors.grayscale.$06};
  margin-bottom: 12px;
`;

const ErrorText = styled.div`
  margin-bottom: 10px;
  font-family: ${fonts.pretendard.$500};
  color: ${colors.point.red};
`;

const QuestionTitle = styled.h1`
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 28px;
  line-height: 1.3;
  margin: 0 0 12px 0;
`;

const Description = styled.p`
  font-family: ${fonts.pretendard.$400};
  color: ${colors.grayscale.$05};
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 20px 0;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 220px;
  border: 1px solid ${colors.grayscale.$09};
  border-radius: 16px;
  padding: 16px;
  font-family: ${fonts.pretendard.$400};
  font-size: 16px;
  outline: none;
  resize: none;

  &:focus {
    border-color: ${colors.primary.$01};
  }
`;

const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SelectRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const SelectLabel = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
  font-family: ${fonts.pretendard.$600};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
`;

const Select = styled.select`
  flex: 1;
  border: 1px solid ${colors.grayscale.$09};
  border-radius: 12px;
  height: 48px;
  padding: 0 12px;
  font-family: ${fonts.pretendard.$400};
  font-size: 16px;
  outline: none;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
`;

const BaseButton = styled.button`
  height: 52px;
  border-radius: 14px;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  border: none;
  cursor: pointer;
  flex: 1;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GhostButton = styled(BaseButton)`
  background: ${colors.grayscale.$10};
  color: ${colors.secondary.black};
`;

const PrimaryButton = styled(BaseButton)`
  background: ${colors.primary.$01};
  color: ${colors.secondary.white};
`;

export default OnboardingPage;
