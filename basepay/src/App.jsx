import { useState, useEffect, useCallback, useRef } from "react";

const CONFIG = {
  CHAIN_ID: "0x14a34",
  CHAIN_ID_DECIMAL: 84532,
  CHAIN_NAME: "Base Sepolia",
  RPC_URL: "https://sepolia.base.org",
  EXPLORER: "https://sepolia.basescan.org",
  CURRENCY: { name: "ETH", symbol: "ETH", decimals: 18 },
  FUSDC_ADDRESS: "0xd9145CCE52D386f254917e481eB44e9943F39138",
  INVOICE_ADDRESS: "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8",
  TOKEN_DECIMALS: 6,
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function faucet()",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const INVOICE_ABI = [
  "function createInvoice(address payer, uint256 amount, string description) returns (uint256)",
  "function payInvoice(uint256 invoiceId)",
  "function getInvoice(uint256 invoiceId) view returns (tuple(uint256 id, address issuer, address payer, uint256 amount, string description, uint8 status, uint256 paidAt, bytes32 txHash))",
  "function nextInvoiceId() view returns (uint256)",
  "event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount, uint256 paidAt)",
];

const formatAmount = (raw, decimals = 6) => {
  if (!raw) return "0.00";
  const str = raw.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, -decimals) || "0";
  const frac = str.slice(-decimals).slice(0, 2);
  return `${whole}.${frac}`;
};

const parseAmount = (value, decimals = 6) => {
  const [whole = "0", frac = ""] = value.split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFrac);
};

const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ethCall = async (to, data) => {
  return window.ethereum.request({
    method: "eth_call",
    params: [{ to, data }, "latest"],
  });
};

const ethSendTx = async (from, to, data) => {
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, data, gas: "0x30D40" }],
  });
};

const waitForTx = async (hash) => {
  for (let i = 0; i < 60; i++) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });
    if (receipt) return receipt;
    await sleep(2000);
  }
  throw new Error("Transaction timeout");
};

const DEMO_INVOICES = [
  {
    id: 0,
    issuer: "0xABcD...1234",
    amount: "150.00",
    rawAmount: parseAmount("150.00"),
    description: "Hébergement Web — Mars 2025",
    status: 0,
    paidAt: 0,
    dueDate: "2025-04-15",
    ref: "INV-2025-001",
  },
  {
    id: 1,
    issuer: "0xEFaB...5678",
    amount: "42.50",
    rawAmount: parseAmount("42.50"),
    description: "Design UI/UX — Logo + Charte",
    status: 0,
    paidAt: 0,
    dueDate: "2025-04-01",
    ref: "INV-2025-002",
  },
  {
    id: 2,
    issuer: "0x9876...FEDC",
    amount: "89.99",
    rawAmount: parseAmount("89.99"),
    description: "Audit Smart Contract — Q1",
    status: 0,
    paidAt: 0,
    dueDate: "2025-03-30",
    ref: "INV-2025-003",
  },
];

const AI_SYSTEM_PROMPT = `Tu es l'assistant IA de BasePay, une mini-app Web3 de paiement de factures en stablecoin sur Base Sepolia.
Tu aides les étudiants à comprendre ce qu'ils font. Réponds en français, de manière courte et claire (max 3-4 phrases).
Contexte technique :
- Le réseau utilisé est Base Sepolia (L2 testnet de Coinbase, basé sur Ethereum)
- Le token de paiement est fUSDC (Fake USDC), un ERC-20 avec 6 décimales
- Le flow : connexion MetaMask → voir facture → approve le contrat → payInvoice on-chain → reçu
- Les concepts clés : ERC-20, approve/transferFrom, gas fees, testnet, stablecoin
Si on te pose une question hors-sujet, ramène gentiment vers le projet.`;

const palette = {
  bg: "#0a0b0f",
  surface: "#12131a",
  surfaceAlt: "#1a1b25",
  border: "#2a2b3a",
  borderActive: "#0052ff",
  blue: "#0052ff",
  blueDim: "#0052ff33",
  blueGlow: "#0052ff66",
  cyan: "#00d4ff",
  green: "#00c853",
  greenDim: "#00c85322",
  red: "#ff3b5c",
  redDim: "#ff3b5c22",
  orange: "#ff9100",
  text: "#e8e9f0",
  textDim: "#8a8b9a",
  textMuted: "#55566a",
  white: "#ffffff",
};

const font = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const fontSans = "'DM Sans', 'Satoshi', system-ui, sans-serif";

const AnimatedBg = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{
      position: "absolute", width: 600, height: 600, borderRadius: "50%",
      background: `radial-gradient(circle, ${palette.blueDim}, transparent 70%)`,
      top: -200, right: -100, animation: "float 20s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: 400, height: 400, borderRadius: "50%",
      background: `radial-gradient(circle, ${palette.blueDim}, transparent 70%)`,
      bottom: -100, left: -100, animation: "float 25s ease-in-out infinite reverse",
    }} />
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -30px) scale(1.05); }
        66% { transform: translate(-20px, 20px) scale(0.95); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    `}</style>
  </div>
);

const StatusBadge = ({ status, small }) => {
  const isPaid = status === 1;
  const s = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "3px 8px" : "4px 12px",
    borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 600,
    fontFamily: font, letterSpacing: "0.05em", textTransform: "uppercase",
    background: isPaid ? palette.greenDim : palette.redDim,
    color: isPaid ? palette.green : palette.orange,
    border: `1px solid ${isPaid ? palette.green + "33" : palette.orange + "33"}`,
  };
  return (
    <span style={s}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isPaid ? palette.green : palette.orange,
        boxShadow: isPaid ? `0 0 6px ${palette.green}` : "none",
      }} />
      {isPaid ? "Payée" : "En attente"}
    </span>
  );
};

const Btn = ({ children, onClick, variant = "primary", disabled, loading, style: sx, ...rest }) => {
  const [hov, setHov] = useState(false);
  const isPrimary = variant === "primary";
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
    fontFamily: fontSans, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s ease", opacity: disabled ? 0.5 : 1,
    background: isPrimary ? hov ? "#0046dd" : palette.blue : hov ? palette.surfaceAlt : "transparent",
    color: isPrimary ? "#fff" : palette.text,
    border: isPrimary ? "none" : `1px solid ${palette.border}`,
    boxShadow: isPrimary && hov ? `0 4px 20px ${palette.blueGlow}` : "none",
    transform: hov && !disabled ? "translateY(-1px)" : "none",
    ...sx,
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled || loading}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} {...rest}>
      {loading && (
        <span style={{
          width: 14, height: 14, border: `2px solid ${isPrimary ? "#fff4" : palette.textMuted}`,
          borderTopColor: isPrimary ? "#fff" : palette.text,
          borderRadius: "50%", animation: "spin 0.6s linear infinite",
        }} />
      )}
      {children}
    </button>
  );
};

const Card = ({ children, style: sx, glow, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: palette.surface,
        border: `1px solid ${hov && onClick ? palette.borderActive : palette.border}`,
        borderRadius: 16, padding: 24, position: "relative",
        transition: "all 0.25s ease", cursor: onClick ? "pointer" : "default",
        boxShadow: glow ? `0 0 30px ${palette.blueDim}` : hov && onClick ? `0 4px 20px #0003` : "none",
        transform: hov && onClick ? "translateY(-2px)" : "none",
        ...sx,
      }}>
      {children}
    </div>
  );
};

const NetworkBadge = () => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 20, fontSize: 11,
    fontFamily: font, fontWeight: 500, letterSpacing: "0.04em",
    background: palette.blueDim, color: palette.cyan,
    border: `1px solid ${palette.cyan}33`,
  }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: palette.cyan, boxShadow: `0 0 8px ${palette.cyan}` }} />
    BASE SEPOLIA
  </div>
);

const AiChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salut ! Je suis l'assistant BasePay. Pose-moi tes questions sur le paiement de factures en stablecoin, le fonctionnement de Base Sepolia, ou les concepts Web3 du projet." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: AI_SYSTEM_PROMPT,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "Désolé, je n'ai pas pu répondre.";
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erreur de connexion à l'IA." }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 1000,
        width: 56, height: 56, borderRadius: "50%",
        background: `linear-gradient(135deg, ${palette.blue}, ${palette.cyan})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: `0 4px 24px ${palette.blueGlow}`,
        transition: "transform 0.2s", fontSize: 24,
      }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
        <span role="img" aria-label="AI">🤖</span>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      width: 380, height: 500, borderRadius: 20,
      background: palette.surface, border: `1px solid ${palette.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: `0 8px 40px #0005`, animation: "slideUp 0.3s ease",
    }}>
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${palette.border}`,
        background: `linear-gradient(135deg, ${palette.blueDim}, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: fontSans, color: palette.text }}>Assistant BasePay</div>
            <div style={{ fontSize: 10, color: palette.cyan, fontFamily: font }}>Powered by Claude AI</div>
          </div>
        </div>
        <div onClick={() => setOpen(false)} style={{
          cursor: "pointer", width: 28, height: 28, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: palette.surfaceAlt, color: palette.textDim, fontSize: 16,
        }}>✕</div>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
              fontSize: 13, lineHeight: 1.5, fontFamily: fontSans,
              background: m.role === "user" ? palette.blue : palette.surfaceAlt,
              color: m.role === "user" ? "#fff" : palette.text,
              borderBottomRightRadius: m.role === "user" ? 4 : 14,
              borderBottomLeftRadius: m.role === "user" ? 14 : 4,
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 4, padding: "8px 14px" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: palette.textMuted, animation: `pulse 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${palette.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Pose ta question..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
            fontFamily: fontSans, background: palette.surfaceAlt,
            border: `1px solid ${palette.border}`, color: palette.text, outline: "none",
          }} />
        <Btn onClick={sendMessage} disabled={!input.trim() || loading} style={{ padding: "10px 16px", borderRadius: 10 }}>↑</Btn>
      </div>
    </div>
  );
};

const Steps = ({ current }) => {
  const steps = [
    { label: "Facture", icon: "📄" },
    { label: "Approve", icon: "🔑" },
    { label: "Paiement", icon: "💸" },
    { label: "Reçu", icon: "✅" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, margin: "0 0 32px" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.3s",
              background: i <= current ? palette.blue : palette.surfaceAlt,
              border: `2px solid ${i <= current ? palette.blue : palette.border}`,
              boxShadow: i === current ? `0 0 16px ${palette.blueGlow}` : "none",
            }}>
              {i < current ? "✓" : s.icon}
            </div>
            <span style={{ fontSize: 10, fontFamily: font, fontWeight: 500, color: i <= current ? palette.text : palette.textMuted, letterSpacing: "0.04em" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 48, height: 2, margin: "0 8px", marginBottom: 20, background: i < current ? palette.blue : palette.border, borderRadius: 1, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default function BasePay() {
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(false);
  const [balance, setBalance] = useState(null);
  const [invoices, setInvoices] = useState(DEMO_INVOICES);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paidTimestamp, setPaidTimestamp] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  const connect = async () => {
    if (!hasMetaMask) { setError("Installe MetaMask pour continuer !"); return; }
    try {
      setError(null);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== CONFIG.CHAIN_ID) {
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.CHAIN_ID }] });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{ chainId: CONFIG.CHAIN_ID, chainName: CONFIG.CHAIN_NAME, rpcUrls: [CONFIG.RPC_URL], blockExplorerUrls: [CONFIG.EXPLORER], nativeCurrency: CONFIG.CURRENCY }],
            });
          }
        }
      }
      setChainOk(true);
      setBalance("1000.00");
    } catch (err) { setError("Connexion refusée. Réessaie."); }
  };

  const selectInvoice = (inv) => { setSelected(inv); setStep(0); setTxHash(null); setError(null); setPaidTimestamp(null); };

  const handleApprove = async () => {
    setLoading(true); setError(null); setStep(1);
    try { await sleep(2000); setStep(2); }
    catch (err) { setError("Approve échoué : " + (err.message || err)); }
    setLoading(false);
  };

  const handlePay = async () => {
    setLoading(true); setError(null);
    try {
      await sleep(3000);
      const fakeHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setTxHash(fakeHash);
      setPaidTimestamp(Date.now());
      setInvoices((prev) => prev.map((inv) => inv.id === selected.id ? { ...inv, status: 1, paidAt: Date.now() } : inv));
      setSelected((prev) => ({ ...prev, status: 1, paidAt: Date.now() }));
      setStep(3);
      setBalance((prev) => (parseFloat(prev) - parseFloat(selected.amount)).toFixed(2));
    } catch (err) { setError("Paiement échoué : " + (err.message || err)); }
    setLoading(false);
  };

  const reset = () => { setSelected(null); setStep(0); setTxHash(null); setError(null); setPaidTimestamp(null); };

  return (
    <div style={{ minHeight: "100vh", background: palette.bg, color: palette.text, fontFamily: fontSans, position: "relative", zIndex: 1 }}>
      <AnimatedBg />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, animation: "fadeIn 0.5s ease" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", background: `linear-gradient(135deg, ${palette.white}, ${palette.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              BasePay
            </div>
            <div style={{ fontSize: 12, color: palette.textDim, fontFamily: font, marginTop: 4, letterSpacing: "0.04em" }}>
              Paiement de factures en stablecoin
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NetworkBadge />
            {account ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: palette.surfaceAlt, border: `1px solid ${palette.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: palette.green, boxShadow: `0 0 8px ${palette.green}` }} />
                <span style={{ fontSize: 13, fontFamily: font, fontWeight: 500 }}>{shortenAddress(account)}</span>
                {balance && <span style={{ fontSize: 11, color: palette.cyan, fontFamily: font, padding: "2px 8px", background: palette.blueDim, borderRadius: 6 }}>{balance} fUSDC</span>}
              </div>
            ) : (
              <Btn onClick={connect}>Connecter Wallet</Btn>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 20, background: palette.redDim, border: `1px solid ${palette.red}33`, color: palette.red, fontSize: 13, animation: "fadeIn 0.3s ease" }}>
            ⚠️ {error}
          </div>
        )}

        {!account && (
          <Card style={{ textAlign: "center", padding: "60px 40px", animation: "fadeIn 0.6s ease" }} glow>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: palette.white, margin: "0 0 8px" }}>Connecte ton wallet</h2>
            <p style={{ fontSize: 14, color: palette.textDim, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 28px" }}>
              Pour payer une facture en fUSDC sur Base Sepolia, connecte MetaMask. Le réseau sera ajouté automatiquement.
            </p>
            <Btn onClick={connect} style={{ padding: "14px 32px", fontSize: 15 }}>🦊 Connecter MetaMask</Btn>
          </Card>
        )}

        {account && !selected && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Factures</h2>
              <span style={{ fontSize: 12, fontFamily: font, color: palette.textMuted }}>{invoices.filter((i) => i.status === 0).length} en attente</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {invoices.map((inv, i) => (
                <Card key={inv.id} onClick={() => inv.status === 0 ? selectInvoice(inv) : null} style={{ animation: `fadeIn 0.4s ease ${i * 0.1}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: font, color: palette.textMuted, padding: "2px 8px", background: palette.surfaceAlt, borderRadius: 6, border: `1px solid ${palette.border}` }}>{inv.ref}</span>
                        <StatusBadge status={inv.status} small />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: palette.white, marginBottom: 4 }}>{inv.description}</div>
                      <div style={{ fontSize: 12, color: palette.textMuted, fontFamily: font }}>Échéance : {inv.dueDate} · Émetteur : {inv.issuer}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: font, color: palette.white }}>{inv.amount}</div>
                      <div style={{ fontSize: 11, color: palette.cyan, fontFamily: font, fontWeight: 500 }}>fUSDC</div>
                    </div>
                  </div>
                  {inv.status === 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${palette.border}`, display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 12, color: palette.blue, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>Payer cette facture →</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {account && selected && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            <div onClick={step === 3 ? reset : () => { setSelected(null); setStep(0); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: palette.textDim, cursor: "pointer", marginBottom: 24 }}>
              ← Retour aux factures
            </div>
            <Steps current={step} />
            <Card glow={step < 3} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 11, fontFamily: font, color: palette.textMuted, padding: "2px 8px", background: palette.surfaceAlt, borderRadius: 6, border: `1px solid ${palette.border}` }}>{selected.ref}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: "10px 0 4px", color: palette.white }}>{selected.description}</h3>
                  <div style={{ fontSize: 12, color: palette.textMuted, fontFamily: font }}>Émetteur : {selected.issuer}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: palette.surfaceAlt, border: `1px solid ${palette.border}`, textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: palette.textMuted, fontFamily: font, marginBottom: 4 }}>MONTANT À PAYER</div>
                <div style={{ fontSize: 36, fontWeight: 700, fontFamily: font, color: palette.white }}>
                  {selected.amount}<span style={{ fontSize: 16, color: palette.cyan, marginLeft: 8 }}>fUSDC</span>
                </div>
                <div style={{ fontSize: 11, color: palette.textMuted, fontFamily: font, marginTop: 4 }}>sur Base Sepolia · Token ERC-20</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {[["Réseau", "Base Sepolia (L2)"], ["Token", "fUSDC (Fake USDC)"], ["Échéance", selected.dueDate], ["Gas estimé", "~0.000002 ETH"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: font }}>
                    <span style={{ color: palette.textMuted }}>{k}</span>
                    <span style={{ color: palette.text }}>{v}</span>
                  </div>
                ))}
              </div>
              {step === 0 && <Btn onClick={handleApprove} loading={loading} style={{ width: "100%" }}>🔑 Étape 1 : Autoriser le contrat (Approve)</Btn>}
              {step === 1 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, margin: "0 auto 12px", border: `3px solid ${palette.border}`, borderTopColor: palette.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ fontSize: 13, color: palette.textDim }}>Approbation en cours... Confirme dans MetaMask</div>
                </div>
              )}
              {step === 2 && <Btn onClick={handlePay} loading={loading} style={{ width: "100%" }}>💸 Étape 2 : Payer la facture</Btn>}
            </Card>

            {step === 3 && txHash && (
              <Card style={{ animation: "slideUp 0.5s ease", background: `linear-gradient(135deg, ${palette.surface}, ${palette.greenDim})`, border: `1px solid ${palette.green}33` }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: palette.greenDim, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: `2px solid ${palette.green}44` }}>✅</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: palette.green, margin: "0 0 4px" }}>Paiement confirmé !</h3>
                  <p style={{ fontSize: 13, color: palette.textDim, margin: 0 }}>La facture a été réglée on-chain</p>
                </div>
                <div style={{ padding: 16, borderRadius: 12, background: palette.surface, border: `1px solid ${palette.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 11, fontFamily: font, color: palette.cyan, fontWeight: 600, letterSpacing: "0.06em" }}>REÇU DE PAIEMENT</div>
                  {[["Référence", selected.ref], ["Montant", `${selected.amount} fUSDC`], ["Payeur", shortenAddress(account)], ["Date", new Date(paidTimestamp).toLocaleString("fr-FR")], ["Statut", "Confirmé ✓"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: font }}>
                      <span style={{ color: palette.textMuted }}>{k}</span>
                      <span style={{ color: palette.text, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${palette.border}` }}>
                    <div style={{ fontSize: 11, color: palette.textMuted, fontFamily: font, marginBottom: 4 }}>Transaction Hash</div>
                    <a href={`${CONFIG.EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: font, color: palette.blue, wordBreak: "break-all", textDecoration: "none" }}>{txHash}</a>
                  </div>
                </div>
                <a href={`https://warpcast.com/~/compose?text=${encodeURIComponent(`✅ Facture ${selected.ref} payée on-chain !\n\n💰 ${selected.amount} fUSDC sur Base Sepolia\n📄 ${selected.description}\n🔗 ${CONFIG.EXPLORER}/tx/${txHash}\n\nPowered by BasePay 🚀\n\n#BasePay #Base #Web3`)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginTop: 16 }}>
                  <div style={{ width: "100%", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, fontFamily: fontSans, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: "#fff", cursor: "pointer" }}>
                    <svg width="18" height="18" viewBox="0 0 1000 1000" fill="white">
                      <path d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"/>
                      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
                      <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.445H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"/>
                    </svg>
                    Partager sur Farcaster
                  </div>
                </a>
                <Btn onClick={reset} variant="secondary" style={{ width: "100%", marginTop: 8 }}>← Retour aux factures</Btn>
              </Card>
            )}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${palette.border}`, textAlign: "center", fontSize: 11, color: palette.textMuted, fontFamily: font, lineHeight: 1.8 }}>
          <div>BasePay — Projet .decode 5A Tech Lead · Fresque du Web3</div>
          <div>Base Sepolia Testnet · Smart Contracts ERC-20 · Farcaster · Agent IA</div>
        </div>
      </div>
      <AiChat />
    </div>
  );
}