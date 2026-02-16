import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Layout,
  Card,
  Typography,
  Modal,
  Button,
  Statistic,
  Input,
  Grid,
  Row,
  Col,
  Image,
  message,
  Spin,
} from "antd";

import "./App.css";
import red1 from "./assets/redEnv1.jpeg";
import red2 from "./assets/redEnv2.jpeg";
import red3 from "./assets/redEnv3.jpeg";

const { Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function getClientHints() {
  return {
    platform: navigator.platform || "",
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: { w: window.screen?.width || 0, h: window.screen?.height || 0 },
  };
}

export default function App() {
  const envelopes = useMemo(() => [red1, red2, red3], []);
  const screens = useBreakpoint();

  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [luckyMoney, setLuckyMoney] = useState(null);
  const [status, setStatus] = useState("");
  const [envelopeAmounts, setEnvelopeAmounts] = useState(null);
  const [loadingEnvelopes, setLoadingEnvelopes] = useState(false);
  const [isVnd, setIsVnd] = useState(false);
  const [showFirstPage, setShowFirstPage] = useState(false);
  const [hasAlreadyPicked, setHasAlreadyPicked] = useState(false);
  const [previousPickedAmount, setPreviousPickedAmount] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setShowFirstPage(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isModalOpen || luckyMoney == null) return;

    // Initial celebratory burst from center
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ffda6b", "#C74D4F", "#ffc425", "#ffffff", "#CD071E"],
    });

    // Side cannons for a few seconds
    const duration = 2500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#ffda6b", "#C74D4F", "#ffc425", "#ffffff"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#ffda6b", "#C74D4F", "#ffc425", "#ffffff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [isModalOpen, luckyMoney]);

  const handleStart = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      message.error("Please enter your name");
      return;
    }
    setName(trimmed);
    setStarted(true);
    setLoadingEnvelopes(true);
    const res = await fetch(`/api/envelopes?name=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    setLoadingEnvelopes(false);
    if (data.ok) {
      setEnvelopeAmounts(data.amounts);
      setIsVnd(data.country === "VN");
      setHasAlreadyPicked(!!data.has_picked);
      setPreviousPickedAmount(data.picked_amount ?? null);
      if (data.has_picked && data.picked_amount != null) {
        setLuckyMoney(data.picked_amount);
        setIsModalOpen(true);
      }
    } else {
      message.error(data.error || "Failed to load envelopes");
      setStarted(false);
    }
  };

  const openEnvelope = async () => {
    if (!envelopeAmounts || hasAlreadyPicked) return;
    const amount = envelopeAmounts[activeIndex];
    setLuckyMoney(amount);
    setIsModalOpen(true);

    try {
      const res = await fetch("/api/record-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          selectedEnvelope: activeIndex,
          amount,
          clientHints: getClientHints(),
        }),
      });
      const data = await res.json();
      if (!data.ok && res.status === 409) {
        setHasAlreadyPicked(true);
        setPreviousPickedAmount(data.picked_amount);
        setLuckyMoney(data.picked_amount);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to record pick:", err);
    }
  };

  useEffect(() => {
    if (!started) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i < envelopes.length - 1 ? i + 1 : 0));
      else if (e.key === "ArrowRight") setActiveIndex((i) => (i > 0 ? i - 1 : envelopes.length - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, envelopes.length]);

  const touchStart = useRef({ x: 0, y: 0 });
  const didSwipe = useRef(false);
  const SWIPE_THRESHOLD = 50;

  const handleSwipe = useCallback(
    (e) => {
      if (!e.changedTouches?.[0]) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - touchStart.current.x;
      const deltaY = endY - touchStart.current.y;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (Math.abs(deltaX) < Math.abs(deltaY)) return;

      didSwipe.current = true;
      if (deltaX > 0) {
        setActiveIndex((i) => (i > 0 ? i - 1 : envelopes.length - 1));
      } else {
        setActiveIndex((i) => (i < envelopes.length - 1 ? i + 1 : 0));
      }
    },
    [envelopes.length]
  );

  const handleTouchStart = useCallback((e) => {
    didSwipe.current = false;
    if (e.touches?.[0]) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleEnvelopeClick = useCallback(
    (idx) => {
      if (didSwipe.current) return;
      setActiveIndex(idx);
    },
    []
  );

  // Responsive image size (xs: 120 for narrow phones, sm: 200, md+: 260-320)
  const imageWidth = screens.xs ? 120 : screens.sm ? 200 : screens.md ? 260 : 320;

  return (
    <Layout style={{ minHeight: "100dvh", height: "100%", display: "flex", flexDirection: "column", overflow: "auto", background: "#F4F0DB", WebkitOverflowScrolling: "touch" }}>
      <Content
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: screens.xs ? 12 : 24,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <Row justify="center" align="middle" style={{ width: screens.xs ? "100%" : "75%" }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <div className={`main-card-wrapper ${showFirstPage ? "first-page-visible" : ""}`}>
              <div className="corner-highlight corner-tl" />
              <div className="corner-highlight corner-tr" />
              <div className="corner-highlight corner-bl" />
              <div className="corner-highlight corner-br" />
            <Card
              bordered={false}
              className="main-card"
              style={{
                textAlign: "center",
                borderRadius: screens.xs ? 16 : 20,
                backgroundColor: "#C74D4F",
                padding: screens.xs ? 16 : 24,
              }}
            >
              <div
                className={`match-btn-width ${screens.xs ? "match-btn-width--mobile" : ""}`}
                style={{
                  padding: screens.xs ? "12px 10px" : "16px 12px",
                  marginBottom: screens.xs ? 16 : 20,
                  border: "3px solid rgba(255,255,255,0.6)",
                  borderRadius: screens.xs ? 10 : 12,
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Title level={screens.xs ? 3 : 2} 
                className={started ? "choice-reveal" : ""} 
                style={{ color: "#ffda6b", fontWeight: 700,
                  margin: 0, ...(started ? { animationDelay: "0s" } : {}) }}>
                  🧧 Lunar New Year Lucky Money 🐎
                </Title>
              </div>

              <div className={`name-form-section ${started ? "name-form-section--hidden" : ""}`}>
                <Text style={{ color: "#ffffff", fontWeight: "500" }}>Wishing you a year of success and happiness!</Text>

                <Input
                  placeholder="Your Name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onPressEnter={handleStart}
                  className={`match-btn-width name-input ${screens.xs ? "match-btn-width--mobile" : ""}`}
                  style={{ marginTop: screens.xs ? 16 : 20, 
                    textAlign: "center",
                    backgroundColor: "#CD071E",
                    color: "#ffda6b",
                    fontSize: screens.xs ? "16px" : undefined,
                  }}
                />
                
                <Text style={{ 
                  textAlign: "center", 
                  fontSize: screens.xs ? "0.7rem" : "0.65rem",
                  color: "#ffffff"
                  }}
                >
                    Enter your name to reveal your lucky money
                </Text>

                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <Button
                    type="primary"
                    size="large"
                    className={`open-envelope-btn ${screens.xs ? "open-envelope-btn--mobile" : ""}`}
                    style={{
                      background: "radial-gradient(circle at center, #ffda6b 0%, #ffc425 50%, #d4a000 100%)",
                      borderColor: "#d4a000",
                      fontWeight: 700,
                      fontSize: screens.xs ? "1rem" : "1.25rem",
                      color: "#8b0000",
                    }}
                    onClick={handleStart}
                  >
                    Open Red Envelope
                  </Button>
                </div>
              </div>

              {started && (
                <div className="envelope-choice-page">
                  {loadingEnvelopes && (
                    <Spin size="large" style={{ marginBottom: 16 }} />
                  )}
                  {hasAlreadyPicked ? (
                    <>
                      <Text strong className="choice-title choice-reveal"
                        style={{ color: "#ffffff", animationDelay: "0.5s" }}>
                        You've already chosen your envelope, {name}! 🧧
                      </Text>
                      <Text className="choice-hint choice-reveal"
                        style={{ color: "#ffffff", animationDelay: "1s", display: "block", marginTop: 16 }}>
                        Your lucky money was {isVnd ? "" : "$"}
                        {previousPickedAmount != null
                          ? (isVnd
                              ? Number(previousPickedAmount).toLocaleString("vi-VN") + " ₫"
                              : Number(previousPickedAmount).toLocaleString())
                          : "—"}
                      </Text>
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => {
                          setLuckyMoney(previousPickedAmount);
                          setIsModalOpen(true);
                        }}
                        className="choice-reveal"
                        style={{
                          marginTop: 24,
                          animationDelay: "1.5s",
                          background: "radial-gradient(circle at center, #ffda6b 0%, #ffc425 50%, #d4a000 100%)",
                          borderColor: "#d4a000",
                          color: "#8b0000",
                        }}
                      >
                        View Your Lucky Money
                      </Button>
                    </>
                  ) : (
                    <>
                      <Text strong className="choice-title choice-reveal"
                        style={{ color: "#ffffff", animationDelay: "0.5s" }}>
                        Blessings, {name}! Choose your red envelope for good fortune 🧧
                      </Text>
                      <Text type="secondary" className="choice-hint choice-reveal"
                        style={{ color: "#ffffff", animationDelay: "1s" }}>
                        {screens.xs
                          ? "Tap or swipe to choose an envelope, then tap Confirm"
                          : "Click an envelope to choose, then click Confirm"}
                      </Text>

                      <div
                        className="envelope-stack-wrapper choice-reveal"
                        style={{ animationDelay: "2s" }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleSwipe}
                      >
                        <div
                          className="envelope-round-table"
                          style={{ width: imageWidth * 2.2, height: imageWidth * 1.4 }}
                        >
                          {envelopes.map((src, idx) => {
                            const n = envelopes.length;
                            const prev = (activeIndex - 1 + n) % n;
                            const next = (activeIndex + 1) % n;
                            const offset =
                              idx === activeIndex ? 0 : idx === prev ? -1 : 1;
                            const isFocused = idx === activeIndex;
                            return (
                              <div
                                key={idx}
                                className={`envelope-item ${isFocused ? "envelope-item--focused" : "envelope-item--background"}`}
                                style={{ "--offset": offset }}
                                onClick={() => handleEnvelopeClick(idx)}
                              >
                                <Image
                                  src={src}
                                  alt={`Envelope ${idx + 1}`}
                                  width={imageWidth}
                                  style={{ borderRadius: 12, display: "block" }}
                                  preview={false}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Button
                        type="primary"
                        danger
                        size="large"
                        onClick={openEnvelope}
                        disabled={!envelopeAmounts}
                        className="choice-reveal"
                        style={{ marginTop: 24, animationDelay: "2.3s" }}
                      >
                        Confirm Choice
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
            </div>
          </Col>
        </Row>

        <Modal
          title="🧧 Your Lucky Money!"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>,
          ]}
          centered
          width={screens.xs ? "calc(100vw - 32px)" : 520}
          style={{ maxWidth: "100%" }}
        >
          <Statistic
            title="Lucky Money Amount"
            value={luckyMoney}
            prefix={isVnd ? undefined : "$"}
            suffix={isVnd ? "₫" : undefined}
            formatter={(val) =>
              isVnd
                ? Number(val).toLocaleString("vi-VN")
                : Number(val).toLocaleString()
            }
          />
          <div style={{ marginTop: 20 }}>
            <Text>{status}</Text>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
}
