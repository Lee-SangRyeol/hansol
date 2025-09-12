import { useEffect, useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { useSession } from "next-auth/react";

interface Character {
  _id: string;
  name: string;
  description: string;
  image: string;
  order: number;
}

interface Props {
  onClose: () => void;
  onAssigned: () => void;
}

// ... 기존 import들 ...

const AssignCharacter = ({ onClose, onAssigned }: Props) => {
  const { data: session } = useSession();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const resp = await fetch("/api/character"); // GET 요청
        if (resp.ok) {
          const list = await resp.json();
          setCharacters(list);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const assign = async (characterName?: string) => {
    if (!session?.user?.name) return;
    setAssigning(true);
    try {
      const resp = await fetch("/api/character", {
        // POST 요청으로 변경
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: session.user.name,
          characterName,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || "배정 실패");
      }
      onAssigned();
    } catch (e) {
      console.error(e);
      alert("역할 배정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>역할 배정</Title>
          <Close onClick={onClose}>×</Close>
        </Header>
        <Body>
          {loading ? (
            <Hint>목록을 불러오는 중...</Hint>
          ) : (
            <>
              <ActionRow>
                <RandomButton disabled={assigning} onClick={() => assign()}>
                  랜덤 배정
                </RandomButton>
              </ActionRow>
              <List>
                {characters.map((c) => (
                  <Item key={c._id}>
                    <Thumb src={`/character/${c.name}.png`} alt={c.name} />
                    <Info>
                      <Name>{c.name}</Name>
                      <Desc>{c.description}</Desc>
                    </Info>
                    <PickButton
                      disabled={assigning}
                      onClick={() => assign(c.name)}
                    >
                      선택
                    </PickButton>
                  </Item>
                ))}
              </List>
            </>
          )}
        </Body>
      </Card>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
`;

const Card = styled.div`
  width: 92%;
  max-width: 560px;
  max-height: 80vh;
  background: ${colors.grayscale.$03};
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  position: relative;
  padding: 14px 48px 14px 16px;
  border-bottom: 1px solid ${colors.grayscale.$05};
`;

const Title = styled.h3`
  margin: 0;
  font-family: ${fonts.pretendard.$700};
  color: ${colors.grayscale.$11};
  font-size: 18px;
`;

const Close = styled.button`
  position: absolute;
  right: 12px;
  top: 8px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: ${colors.grayscale.$09};
  cursor: pointer;
`;

const Body = styled.div`
  padding: 12px 16px;
  overflow-y: auto;
`;

const Hint = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$08};
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

const RandomButton = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${colors.primary.$02};
  color: #fff;
  font-family: ${fonts.pretendard.$600};
  cursor: pointer;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  background: ${colors.grayscale.$02};
  border: 1px solid ${colors.grayscale.$04};
  border-radius: 12px;
  padding: 10px;
`;

const Thumb = styled.img`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid ${colors.primary.$02};
  object-fit: cover;
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-family: ${fonts.pretendard.$700};
  color: ${colors.grayscale.$11};
  font-size: 16px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Desc = styled.div`
  font-family: ${fonts.pretendard.$500};
  color: ${colors.grayscale.$08};
  font-size: 13px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PickButton = styled.button`
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${colors.grayscale.$07};
  color: ${colors.grayscale.$01};
  font-family: ${fonts.pretendard.$600};
  cursor: pointer;
`;

export default AssignCharacter;
