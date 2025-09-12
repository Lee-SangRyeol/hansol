import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "@/constants";
import { useSession } from "next-auth/react";

interface ReasoningData {
  id: string;
  suspect: string;
  evidence: string;
  motive: string;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

const Reasoning = () => {
  const { data: session } = useSession();
  const [reasonings, setReasonings] = useState<ReasoningData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    suspect: "",
    evidence: "",
    motive: "",
    reasoning: "",
    confidence: 50,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suspect || !formData.evidence || !formData.reasoning) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    const newReasoning: ReasoningData = {
      id: Date.now().toString(),
      ...formData,
      timestamp: new Date(),
    };

    setReasonings([newReasoning, ...reasonings]);
    setFormData({
      suspect: "",
      evidence: "",
      motive: "",
      reasoning: "",
      confidence: 50,
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setReasonings(reasonings.filter((r) => r.id !== id));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "#e74c3c";
    if (confidence >= 60) return "#f39c12";
    if (confidence >= 40) return "#f1c40f";
    return "#27ae60";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return "매우 확신";
    if (confidence >= 60) return "확신";
    if (confidence >= 40) return "보통";
    return "의심";
  };

  return (
    <Container>
      <Header>
        <Title>추리 결과</Title>
        <Subtitle>당신의 추리를 정리해보세요</Subtitle>
        <AddButton onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "추리 추가"}
        </AddButton>
      </Header>

      {showForm && (
        <FormContainer>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>용의자 *</Label>
              <Input
                value={formData.suspect}
                onChange={(e) =>
                  setFormData({ ...formData, suspect: e.target.value })
                }
                placeholder="용의자 이름을 입력하세요"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>증거 *</Label>
              <TextArea
                value={formData.evidence}
                onChange={(e) =>
                  setFormData({ ...formData, evidence: e.target.value })
                }
                placeholder="발견한 증거를 설명하세요"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>동기</Label>
              <Input
                value={formData.motive}
                onChange={(e) =>
                  setFormData({ ...formData, motive: e.target.value })
                }
                placeholder="동기를 추측해보세요"
              />
            </FormGroup>

            <FormGroup>
              <Label>추리 과정 *</Label>
              <TextArea
                value={formData.reasoning}
                onChange={(e) =>
                  setFormData({ ...formData, reasoning: e.target.value })
                }
                placeholder="어떻게 결론에 도달했는지 설명하세요"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>확신도: {formData.confidence}%</Label>
              <Slider
                type="range"
                min="0"
                max="100"
                value={formData.confidence}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confidence: parseInt(e.target.value),
                  })
                }
              />
              <ConfidenceText>
                {getConfidenceText(formData.confidence)}
              </ConfidenceText>
            </FormGroup>

            <ButtonGroup>
              <SubmitButton type="submit">추리 저장</SubmitButton>
              <CancelButton type="button" onClick={() => setShowForm(false)}>
                취소
              </CancelButton>
            </ButtonGroup>
          </Form>
        </FormContainer>
      )}

      <ReasoningList>
        {reasonings.length === 0 ? (
          <EmptyState>
            <EmptyIcon>🔍</EmptyIcon>
            <EmptyText>아직 추리가 없습니다</EmptyText>
            <EmptySubtext>위에서 추리를 추가해보세요</EmptySubtext>
          </EmptyState>
        ) : (
          reasonings.map((reasoning) => (
            <ReasoningItem key={reasoning.id}>
              <ReasoningHeader>
                <SuspectName>{reasoning.suspect}</SuspectName>
                <ConfidenceBadge
                  $color={getConfidenceColor(reasoning.confidence)}
                >
                  {reasoning.confidence}% -{" "}
                  {getConfidenceText(reasoning.confidence)}
                </ConfidenceBadge>
                <DeleteButton onClick={() => handleDelete(reasoning.id)}>
                  ✕
                </DeleteButton>
              </ReasoningHeader>

              <ReasoningContent>
                <ContentSection>
                  <ContentLabel>증거:</ContentLabel>
                  <ContentText>{reasoning.evidence}</ContentText>
                </ContentSection>

                {reasoning.motive && (
                  <ContentSection>
                    <ContentLabel>동기:</ContentLabel>
                    <ContentText>{reasoning.motive}</ContentText>
                  </ContentSection>
                )}

                <ContentSection>
                  <ContentLabel>추리 과정:</ContentLabel>
                  <ContentText>{reasoning.reasoning}</ContentText>
                </ContentSection>
              </ReasoningContent>

              <ReasoningFooter>
                <Timestamp>
                  {reasoning.timestamp.toLocaleString("ko-KR")}
                </Timestamp>
              </ReasoningFooter>
            </ReasoningItem>
          ))
        )}
      </ReasoningList>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-family: ${fonts.pretendard.$700};
  font-size: 32px;
  color: #fff;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`;

const Subtitle = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
`;

const AddButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: linear-gradient(135deg, #764ba2, #667eea);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
`;

const FormContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  color: white;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  resize: vertical;
  min-height: 80px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }
`;

const Slider = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ConfidenceText = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const SubmitButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  color: white;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-family: ${fonts.pretendard.$600};
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const ReasoningList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 3px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
`;

const EmptyText = styled.h3`
  font-family: ${fonts.pretendard.$600};
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 8px 0;
`;

const EmptySubtext = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
`;

const ReasoningItem = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
`;

const ReasoningHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SuspectName = styled.h3`
  font-family: ${fonts.pretendard.$700};
  font-size: 20px;
  color: #fff;
  margin: 0;
`;

const ConfidenceBadge = styled.span<{ $color: string }>`
  padding: 4px 12px;
  background: ${(props) => props.$color};
  border-radius: 20px;
  font-family: ${fonts.pretendard.$600};
  font-size: 12px;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const DeleteButton = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(231, 76, 60, 0.8);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: #e74c3c;
    transform: scale(1.1);
  }
`;

const ReasoningContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ContentLabel = styled.span`
  font-family: ${fonts.pretendard.$600};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const ContentText = styled.p`
  font-family: ${fonts.pretendard.$500};
  font-size: 16px;
  color: white;
  margin: 0;
  line-height: 1.5;
`;

const ReasoningFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Timestamp = styled.span`
  font-family: ${fonts.pretendard.$500};
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
`;

export default Reasoning;
