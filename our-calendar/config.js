// Paste the "firebaseConfig" object from your Firebase project here
// (Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration → Config).
// These values are not secret: access to your plans is protected by sign-in and the rules in firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCFp1hDvzq-D7O4XMUzki9BOEbibICOxmU",
  authDomain: "our-calendar-3d152.firebaseapp.com",
  projectId: "our-calendar-3d152",
  storageBucket: "our-calendar-3d152.firebasestorage.app",
  messagingSenderId: "517769560566",
  appId: "1:517769560566:web:b6b59485084b63468887d7"
};

// Who is who. Emails are stored as SHA-256 fingerprints so they don't appear in this public repo.
// "a" = coral, "b" = green.
export const people = {
  "e085e111ab9d051897341eff0a99088ba4520c4b64150907c26c9d65f27fceeb": { slot: "a", name: "Kess ❤️" },
  "809f200903ac2face6c1bb18b95edd1480fe9c8a9ad6cf8baebebf3241fd569a": { slot: "b", name: "Bumblebee 😘" }
};
