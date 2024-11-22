import { AppProps } from "next/app";
import { ThemeProvider, DefaultTheme } from "styled-components";
import GlobalStyle from "../components/globalstyles";
import { ApolloProvider } from "@apollo/client";
import client from "../apollo/apollo";
import type { ReactElement, ReactNode } from "react";
import type { NextPage } from "next";
import "../styles/fonts.css";
import Toast from "../components/toastBar";
import { SessionProvider } from "next-auth/react";

const theme: DefaultTheme = {
  colors: {
    primary: "#111",
    secondary: "#0070f3",
  },
};

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <SessionProvider session={session}>
        <ApolloProvider client={client}>
          <ThemeProvider theme={theme}>
            <GlobalStyle />
            {getLayout(<Component {...pageProps} />)}
            <Toast />
          </ThemeProvider>
        </ApolloProvider>
      </SessionProvider>
    </>
  );
}
