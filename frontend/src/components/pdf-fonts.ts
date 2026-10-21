// Registers the app's fonts with the PDF library once (estimates, invoices and the report all use them).
import { Font } from "@react-pdf/renderer";

// The app's own fonts (public/fonts, same as the screen): Montserrat text, Righteous name, JetBrains Mono labels
const font = (file: string) => `${window.location.origin}/fonts/${file}`;
Font.register({
  family: "Montserrat",
  fonts: [
    { src: font("Montserrat-Regular.ttf") },
    { src: font("Montserrat-SemiBold.ttf"), fontWeight: 600 },
    { src: font("Montserrat-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({ family: "Righteous", src: font("Righteous-Regular.ttf") });
Font.register({
  family: "JetBrains Mono",
  fonts: [{ src: font("JetBrainsMono-Regular.ttf") }, { src: font("JetBrainsMono-Bold.ttf"), fontWeight: 700 }],
});
Font.registerHyphenationCallback((word) => [word]); // never split a word with a hyphen
