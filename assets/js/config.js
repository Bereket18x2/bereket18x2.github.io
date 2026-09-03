/* ===========================================================
   config.js — Firebase project configuration.

   THESE VALUES ARE PUBLIC BY DESIGN. Do not "fix" this later by
   hiding the key in an env var, a build step, or a server proxy —
   there is nothing to hide. Every Firebase web app ships this exact
   block in its client bundle; Google documents it as public. The
   apiKey is a project identifier for routing requests, not a secret
   and not a credential.

   What actually protects your data is firestore.rules (in the repo
   root) plus Firebase Auth. If the rules are right, a stranger with
   this config can do nothing they could not already do. If the rules
   are wrong, hiding this config saves you nothing.
   =========================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyARXhyCD9PeZ24e6bcNF7l7dwhqdK6nO7Q",
  authDomain: "finote-yared.firebaseapp.com",
  projectId: "finote-yared",
  storageBucket: "finote-yared.firebasestorage.app",
  messagingSenderId: "828888713418",
  appId: "1:828888713418:web:0db10658af6e83ae220c33"
};

// Monthly price per student, in USD. Kept here so the pricing copy and
// the eventual Stripe hand-off can never drift apart.
export const PRICE_USD = 25;
