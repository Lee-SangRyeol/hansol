import styled from "styled-components";
import { colors, fonts } from "@/constants";

interface StateMessageProps {
  title: string;
  description?: string;
}

const StateMessage = ({ title, description }: StateMessageProps) => {
  return (
    <Wrap>
      <Title>{title}</Title>
      {description ? <Description>{description}</Description> : null}
    </Wrap>
  );
};

const Wrap = styled.div`
  width: 100%;
  border-radius: 16px;
  background: ${colors.secondary.white};
  padding: 18px;
  box-shadow: 0 10px 20px rgba(25, 25, 25, 0.1);
`;

const Title = styled.div`
  font-family: ${fonts.pretendard.$700};
  color: ${colors.secondary.black};
  font-size: 18px;
`;

const Description = styled.div`
  margin-top: 6px;
  font-family: ${fonts.pretendard.$400};
  color: ${colors.grayscale.$06};
  line-height: 1.5;
`;

export default StateMessage;
