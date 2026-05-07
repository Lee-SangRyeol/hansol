import { createGlobalStyle } from "styled-components";
import { colors } from "@/constants";

const GlobalStyle = createGlobalStyle`
  html,
  body {
    overscroll-behavior: none;
    color: ${({ theme }) => theme.colors.primary};
    padding: 0;
    margin: 0;
    background-color: ${colors.secondary.$01};
    min-height: 100vh;
      user-select: none;
  -webkit-user-select: none;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  * {
    box-sizing: border-box;
  }
`;

export default GlobalStyle;
