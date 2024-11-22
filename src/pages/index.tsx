import { useEffect, useState } from "react";
import styled from "styled-components";
import Layout from "../components/layout/layout";
import { ReactElement } from "react";

const Index = () => {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPWA(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, []);

  return (
    <BackgroundWrapper>
      {isPWA ? <></> : <></>}
    </BackgroundWrapper>
  );
};

const BackgroundWrapper = styled.div`
  display: flex;
  justify-content: center;
  height: calc(100vh - 50px);
  background-image: url("/gifs/배경1.gif");
  background-size: cover;
  background-position: center;
  padding-bottom: 100px;
`;

Index.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export async function getServerSideProps() {
  return {
    props: {}, // 필요한 데이터를 여기에 추가
  };
}

export default Index;
