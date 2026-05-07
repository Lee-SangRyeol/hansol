import type { DocumentContext, DocumentInitialProps } from "next/document";
import Document, { Html, Head, Main, NextScript } from "next/document";
import { ServerStyleSheet } from "styled-components";

export default class MyDocument extends Document {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: [initialProps.styles, sheet.getStyleElement()],
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="ko">
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" href="/icons/CoramDeo_icon.png" />
          <link rel="apple-touch-icon" href="/icons/CoramDeo_icon.png" />
          <meta name="application-name" content="코람엠티" />
          <meta name="apple-mobile-web-app-title" content="코람엠티" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />

          <meta name="theme-color" content="#6850FB" />
          <meta name="mobile-web-app-capable" content="yes" />
        </Head>
        <body>
          <Main />
          <div id="modal" />
          <NextScript />
        </body>
      </Html>
    );
  }
}
