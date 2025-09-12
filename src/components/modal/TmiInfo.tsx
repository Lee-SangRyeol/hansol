import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";

interface User {
  name: string;
  team: string;
  score: number;
  tmi?: string;
}

const TmiInfo = () => {
  const { data: session } = useSession();
  const [tmi, setTmi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 사용자의 TMI 정보 불러오기
  useEffect(() => {
    const fetchUserTmi = async () => {
      if (!session?.user?.name) return;

      try {
        const response = await fetch(
          `/api/users?name=${encodeURIComponent(session.user.name)}`
        );
        if (response.ok) {
          const userData: User = await response.json();
          setTmi(userData.tmi || "");
        }
      } catch (error) {
        console.error("Error fetching user TMI:", error);
      }
    };

    fetchUserTmi();
  }, [session?.user?.name]);

  const handleSave = async () => {
    if (!session?.user?.name) return;

    console.log("저장할 데이터:", {
      name: session.user.name,
      tmi,
      snsId: session.user.id,
      session: session,
    });

    setIsLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: session.user.name,
          tmi: tmi,
          snsId: session.user.id,
        }),
      });

      console.log("API 응답 상태:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("API 응답 데이터:", result);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000); // 2초 후 저장 메시지 사라짐
      } else {
        const errorData = await response.json();
        console.error("API 에러:", errorData);
        throw new Error("Failed to save TMI");
      }
    } catch (error) {
      console.error("Error saving TMI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TmiContainer>
      <SectionHeader>
        <SectionTitle>TMI</SectionTitle>
        <SectionSubtitle>나만의 특별한 이야기를 공유해보세요</SectionSubtitle>
      </SectionHeader>

      <TmiCard>
        <TmiInput
          value={tmi}
          onChange={(e) => setTmi(e.target.value)}
          placeholder="자신에 대한 재미있는 이야기나 특별한 경험을 적어보세요..."
          maxLength={500}
        />
        <CharacterCount>{tmi.length}/500</CharacterCount>

        <ButtonContainer>
          <SaveButton
            onClick={handleSave}
            disabled={isLoading}
            $isSaved={isSaved}
          >
            {isLoading ? "저장 중..." : isSaved ? "저장됨!" : "저장하기"}
          </SaveButton>
        </ButtonContainer>
      </TmiCard>
    </TmiContainer>
  );
};

const TmiContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 32px;
`;

const SectionHeader = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-family: ${fonts.pretendard.$600};
  font-size: 28px;
  color: ${colors.grayscale.$11};
  margin: 0 0 8px 0;
`;

const SectionSubtitle = styled.p`
  font-family: ${fonts.pretendard.$400};
  font-size: 16px;
  color: ${colors.grayscale.$08};
  margin: 0;
`;

const TmiCard = styled.div`
  background: ${colors.grayscale.$02};
  border-radius: 12px;
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const TmiInput = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 16px;
  border: 2px solid ${colors.grayscale.$04};
  border-radius: 8px;
  background: ${colors.grayscale.$01};
  color: ${colors.grayscale.$11};
  font-family: ${fonts.pretendard.$400};
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: ${colors.primary.$02};
  }

  &::placeholder {
    color: ${colors.grayscale.$07};
  }
`;

const CharacterCount = styled.div`
  text-align: right;
  font-family: ${fonts.pretendard.$400};
  font-size: 14px;
  color: ${colors.grayscale.$07};
  margin-top: 8px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`;

const SaveButton = styled.button<{ $isSaved: boolean }>`
  background: ${(props) =>
    props.$isSaved ? colors.primary.$03 : colors.primary.$02};
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;

  &:hover:not(:disabled) {
    background: ${colors.primary.$01};
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default TmiInfo;
