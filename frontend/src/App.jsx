import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  Space,
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

  const handleStart = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      message.error("Please enter your name");
      return;
    }
    setName(trimmed);
    setStarted(true);
    setLoadingEnvelopes(true);
    const res = await fetch("/api/envelopes");
    const data = await res.json();
    setLoadingEnvelopes(false);
    if (data.ok) {
      setEnvelopeAmounts(data.amounts);
      setIsVnd(data.country === "VN");
    } else {
      message.error("Failed to load envelopes");
      setStarted(false);
    }
  };

  const openEnvelope = async () => {
    if (envelopeAmounts) {
      const amount = envelopeAmounts[activeIndex];
      setLuckyMoney(amount);
      setIsModalOpen(true);

      try {
        await fetch("/api/record-pick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            selectedEnvelope: activeIndex,
            amount,
            clientHints: getClientHints(),
          }),
        });
      } catch (err) {
        console.error("Failed to record pick:", err);
      }
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

  // Responsive image size (iPhone xs: ~160, sm: 200, md+: 260-320)
  const imageWidth = screens.xs ? 140 : screens.sm ? 200 : screens.md ? 260 : 320;

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f0" }}>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: screens.xs ? 12 : 20,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <Row justify="center" align="middle" style={{ width: "75%" }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card
              bordered={false}
              className="main-card"
              style={{ textAlign: "center", borderRadius: 20 }}
            >
              <Title level={screens.xs ? 3 : 2} className={started ? "choice-reveal" : ""} style={started ? { animationDelay: "0s" } : undefined}>
                🧧 Lunar New Year Lucky Money 🐎
              </Title>

              <div className={`name-form-section ${started ? "name-form-section--hidden" : ""}`}>
                <Text>Enter your name to receive your lucky money</Text>
                <br/>
                <Text>May prosperity follow you!</Text>

                <Space.Compact style={{ width: "100%", marginTop: 20 }}>
                  <Input
                    placeholder="Your Name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onPressEnter={handleStart}
                  />
                  <Button type="primary" onClick={handleStart}>
                    Start
                  </Button>
                </Space.Compact>
              </div>

              {started && (
                <div className="envelope-choice-page">
                  {loadingEnvelopes && (
                    <Spin size="large" style={{ marginBottom: 16 }} />
                  )}
                  <Text strong className="choice-title choice-reveal" style={{ animationDelay: "0.5s" }}>
                    Blessings, {name}! Choose your red envelope for good fortune 🧧
                  </Text>
                  <Text type="secondary" className="choice-hint choice-reveal" style={{ animationDelay: "1s" }}>
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
                    style={{ marginTop: 24, animationDelay: "2.3s", minWidth: 160 }}
                  >
                    Confirm Choice
                  </Button>
                </div>
              )}
            </Card>
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
