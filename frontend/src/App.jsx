import { useMemo, useState, useEffect } from "react";
import {
  Layout,
  Card,
  Typography,
  Modal,
  Button,
  Statistic,
  Form,
  Input,
  Grid,
  Row,
  Col,
  Space,
  Image,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

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

  const [form] = Form.useForm();

  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [luckyMoney, setLuckyMoney] = useState(null);
  const [status, setStatus] = useState("");

  const handleStart = (values) => {
    setName(values.name);
    setStarted(true);
  };

  const openEnvelope = async () => {
    const res = await fetch("/api/lucky-money");
    const data = await res.json();

    if (data.ok) {
      setLuckyMoney(data.amount);
      setIsModalOpen(true);
      // setStatus(`Country: ${data.country}`);
    }
  };

  const goPrev = () =>
    setActiveIndex((i) => (i > 0 ? i - 1 : envelopes.length - 1));
  const goNext = () =>
    setActiveIndex((i) => (i < envelopes.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (!started) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i < envelopes.length - 1 ? i + 1 : 0));
      else if (e.key === "ArrowRight") setActiveIndex((i) => (i > 0 ? i - 1 : envelopes.length - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, envelopes.length]);

  // Responsive image size (iPhone xs: ~160, sm: 200, md+: 260-320)
  const imageWidth = screens.xs ? 140 : screens.sm ? 200 : screens.md ? 260 : 320;

  return (
    <Layout style={{ minHeight: "100vh", background: "#2d2d2d" }}>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: screens.xs ? 12 : 20,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <Row justify="center" align="middle" style={{ width: "100%" }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card
              bordered={false}
              className="main-card"
              style={{ textAlign: "center", borderRadius: 20 }}
            >
              <Title level={screens.xs ? 3 : 2}>🎊 Lucky Red Envelope 🎊</Title>

              {!started && (
                <>
                  <Text>Enter your name to receive lucky money 🧧</Text>

                  <Form
                    form={form}
                    onFinish={handleStart}
                    layout="vertical"
                    style={{ marginTop: 20 }}
                  >
                    <Form.Item
                      name="name"
                      rules={[
                        { required: true, message: "Please enter your name" },
                      ]}
                    >
                      <Input placeholder="Your Name" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" block>
                        Start
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              )}

              {started && (
                <div className="envelope-choice-page">
                  <Text strong className="choice-title">
                    Welcome, {name}! Pick your envelope 🧧
                  </Text>
                  <Text type="secondary" className="choice-hint">
                    {screens.xs
                      ? "Tap arrows or envelopes to focus, tap focused to select"
                      : "Use ← → to focus, click to select"}
                  </Text>

                  <Space
                    align="center"
                    size={screens.xs ? "small" : "middle"}
                    className="envelope-stack-wrapper"
                    style={{ width: "100%", maxWidth: imageWidth * 3, justifyContent: "center" }}
                  >
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      size={screens.xs ? "middle" : "large"}
                      icon={<LeftOutlined />}
                      onClick={goNext}
                      aria-label="Previous envelope"
                      className="arrow"
                    />
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
                            onClick={isFocused ? openEnvelope : () => setActiveIndex(idx)}
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
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      size={screens.xs ? "middle" : "large"}
                      icon={<RightOutlined />}
                      onClick={goPrev}
                      aria-label="Next envelope"
                      className="arrow"
                    />
                  </Space>
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
            prefix="$"
          />
          <div style={{ marginTop: 20 }}>
            <Text>{status}</Text>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
}
