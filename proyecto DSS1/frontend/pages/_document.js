// frontend/pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="es">
        <Head />
        <body className="antialiased bg-bg text-text">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
