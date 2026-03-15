# BasePay 💸

Mini-application Web3 de paiement de factures en stablecoin sur Base Sepolia.

Projet réalisé dans le cadre du module **.decode × Base — 5A Tech Lead**.

---

## 🎯 Concept

BasePay permet de simuler le paiement d'une facture en stablecoin (fUSDC) sur la blockchain Base Sepolia. L'utilisateur connecte son wallet MetaMask, visualise ses factures, approuve le contrat ERC-20, effectue le paiement on-chain et reçoit un reçu de transaction.

---

## 🛠️ Stack technique

- **Frontend** : React + Vite
- **Blockchain** : Base Sepolia (L2 Ethereum — Coinbase)
- **Smart Contracts** : Solidity 0.8.20
- **Wallet** : MetaMask (window.ethereum)
- **Agent IA** : Claude API (Anthropic)
- **Social** : Farcaster / Warpcast (share on-chain)

---

## 📁 Structure du projet

```
├── Basepay.jsx           # Frontend React — interface complète
├── FakeUSDC.sol          # Smart contract ERC-20 (stablecoin de test)
├── InvoicePayment.sol    # Smart contract de paiement de factures
└── basepay/              # Projet Vite (npm run dev)
```

---

## 🔄 Parcours utilisateur

1. **Connexion MetaMask** — le réseau Base Sepolia est ajouté automatiquement
2. **Affichage des factures** — liste des factures en attente
3. **Approve** — autorisation du contrat à dépenser les tokens fUSDC
4. **Paiement on-chain** — appel à `payInvoice()` sur le smart contract
5. **Reçu** — affichage du transaction hash + partage sur Farcaster

---

## 📜 Smart Contracts

### FakeUSDC.sol
Token ERC-20 simulant un stablecoin USDC avec 6 décimales. Inclut une fonction `faucet()` permettant à n'importe qui de mint 1000 fUSDC pour les tests.

### InvoicePayment.sol
Contrat de gestion de factures on-chain. Implémente le pattern `approve/transferFrom` standard ERC-20 pour sécuriser les paiements.

---

## 🤖 Agent IA

L'application intègre un assistant IA (powered by Claude) accessible via le bouton en bas à droite. Il aide l'utilisateur à comprendre les concepts Web3 : ERC-20, approve/transferFrom, gas fees, testnets, stablecoins.

---

## 🚀 Lancer le projet

```bash
cd basepay
npm install
npm run dev
```

Ouvrir **http://localhost:5173** dans un navigateur avec MetaMask installé.

---

## 🌐 Réseau

- **Réseau** : Base Sepolia Testnet
- **Chain ID** : 84532
- **RPC** : https://sepolia.base.org
- **Explorer** : https://sepolia.basescan.org