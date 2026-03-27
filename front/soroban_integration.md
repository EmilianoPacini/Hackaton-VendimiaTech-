# 🤖 Soroban Integration Guide (Agent-Ready Specification)

> **Context for Next Agent**: You are a Web3 Frontend Developer Agent. Your objective is to replace the current HTML/JS mockups with real blockchain calls using **Stellar SDK** and **Soroban RPC**, integrating with the **Freighter Wallet**. Do NOT modify the core CSS or the HTML visual structure.

---

## 🛠️ 1. Technical Stack & Setup
- **Network**: Soroban Testnet (Future: Mainnet).
- **Libraries Required**:
  - `@stellar/freighter-api` (For browser wallet interaction).
  - `@stellar/stellar-sdk` (For Soroban RPC calls and XDR parsing).
- **Initialization Command (Agent Task 1)**:
  Run `npm install @stellar/freighter-api @stellar/stellar-sdk` inside the project. Si el proyecto no tiene `package.json`, inicialízalo primero o usa los CDN de estas librerías.

---

## 🏗️ 2. Core Architecture: `sorobanService.js`

**Agent Task 2:** Create a file named `sorobanService.js` in the root folder. This file MUST export the following interface (Object/Class):

```javascript
// sorobanService.js (Skeleton to implement)
import { isConnected, getPublicKey, signTransaction } from "@stellar/freighter-api";
import { rpc, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');

export const SorobanService = {
  /** Check if Freighter is installed and get user PublicKey */
  async connectWallet() { /* return { address: "G..." } */ },
  
  /** Fetch a simulated or real payment intent from a QR payload (String URI) */
  async parsePaymentIntent(qrPayload) { /* return { recipient: "G...", amount: 2450 } */ },
  
  /** Build and send a Soroban transaction */
  async executePayment(recipientId, amountARS) { 
    // 1. Fetch sequence
    // 2. Build XDR (native transfer or custom token)
    // 3. Request Freighter signature
    // 4. Submit to RPC
    // return { status: 'success', hash: '...' }
  }
};
```

---

## 🔄 3. UI Integrations & DOM Hooks

### A. Screen: Dashboard (`index.html`) / Settings (`settings.html`)
**Goal**: Connect Wallet and display balance.

- **DOM Hooks in `index.html`**:
  - Element to click for login (if needed): `<a href="welcome.html">...</a>` (Modify to trigger `connectWallet()` instead).
  - Displays: `<div class="balance-amount">...</div>`
- **Agent Task 3**: 
  - On Page Load, check `isConnected()`. 
  - If connected, fetch the native XLM / Custom Token balance via `rpcServer.getAccount()`.
  - Update innerText of `.balance-amount`.

### B. Screen: QR Scanner (`qr-scan.html`)
**Goal**: Read QR Payload and hydrate the Payment Intent modal, then pass data to the confirmation screen.

- **Current State**: Uses an artificial `setTimeout(simulateScan, 2500)`.
- **Target State**: 
  1. Initialize a real JS QR Scanner (e.g. `html5-qrcode`).
  2. On successful scan (`qrPayload`), call `SorobanService.parsePaymentIntent(qrPayload)`.
  3. Populate the Modal logic:
     - Load overlay: `document.getElementById('mockupModalOverlay').classList.add('active');`
     - Recipient Text: `#modalReadyState .modal-title` -> Update text with decoded recipient.
     - Amount Text: `#modalReadyState .modal-subtitle` -> Update text with decoded amount.
  4. On `btnContinue` click, navigate passing parameters:
     `window.location.href = 'confirm-tx.html?dest=' + recipient + '&amount=' + amount;`

### C. Screen: Confirmation (`confirm-tx.html`)
**Goal**: Request the user's Freighter signature when they use the "Swipe to Pay" component.

- **DOM Hooks**:
  - Name: `.tx-recipient-name`
  - Address: `.tx-recipient-address`
  - Amount: `.tx-amount h2`
- **Agent Task 4**:
  1. On load, read `URLSearchParams` (dest and amount).
  2. Populate the DOM hooks above.
  3. Inside the `completePayment()` function (lines ~202), REPLACE the generic redirect with:
     ```javascript
     function completePayment() {
       btn.style.pointerEvents = 'none';
       text.textContent = 'Firmando...';
       
       // Agent: Call Service
       import { SorobanService } from './sorobanService.js';
       SorobanService.executePayment(params.dest, params.amount)
         .then(res => {
            window.location.href = 'success-tx.html?hash=' + res.hash;
         })
         .catch(err => {
            text.textContent = 'Error: ' + err.message;
            // Rollback swipe UI
         });
     }
     ```

### D. Screen: Success (`success-tx.html`)
**Goal**: Display real transaction confirmation data.

- **DOM Hooks**:
  - Destino: `.receipt-row:nth-child(1) .receipt-value`
  - Status/Hash: `.receipt-row:nth-child(3) .receipt-value`
- **Agent Task 5**: Read the `?hash=` URL parameter. Show the first and last 4 characters of the hash in the UI.

---

## 🚦 4. Execution Rules for the Next Agent
1. **Zero-Chatter**: Do NOT explain what you are doing. Return only the code modifications using the tools.
2. **SOLID**: Keep Soroban logic strictly inside `sorobanService.js`. The HTML files should only contain minimal glue script.
3. **No Design Breakage**: Never touch the `.css` rules or the structure of `.tx-card`, `.mockup-modal`, `.success-icon`, etc.
4. **Error Catching**: Always implement `.catch()` blocks when calling Freighter. If the user cancels the signature, gracefully reset the UI to its active state so they can try again.

---
🚀 **Agent, you are clear to proceed with Implementation Tasks 1 through 5.**
