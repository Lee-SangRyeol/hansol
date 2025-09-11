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

  return <BackgroundWrapper>{isPWA ? <></> : <></>}</BackgroundWrapper>;
};

const BackgroundWrapper = styled.div`
  display: flex;
  justify-content: center;
  height: calc(100vh - 50px);
  background-image: url("/pngs/양팀엠티배경.png");
  background-size: cover;
  background-position: center;
  padding-bottom: 100px;
`;

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
