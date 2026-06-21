import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const LUCY_LOGO_PATH =
  "https://cdn.lucyscircle.ca/cdn-cgi/image/quality=90,width=400/static/logo.png";

const styles = {
  body: {
    margin: "0",
    backgroundColor: "#F3F4F6",
    padding: "80px 8px",
    fontFamily:
      "Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  container: {
    maxWidth: "672px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  },
  logo: {
    display: "block",
    margin: "24px auto 40px",
    borderRadius: "9999px",
  },
  heading: {
    margin: "0 0 12px",
    textAlign: "center",
    fontSize: "28px",
    lineHeight: "36px",
    fontWeight: "600",
    color: "#1F2937",
  },
  bodyText: {
    margin: "16px 0",
    fontSize: "15px",
    lineHeight: "28px",
    color: "#4B5563",
  },
  ctaWrap: {
    marginTop: "32px",
    marginBottom: "32px",
    textAlign: "center",
  },
  cta: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: "9999px",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
    fontSize: "14px",
    lineHeight: "20px",
    textDecoration: "none",
  },
  footer: {
    padding: "32px 0",
    textAlign: "center",
  },
  footerText: {
    margin: "0 0 8px",
    color: "#6B7280",
    fontSize: "12px",
    lineHeight: "18px",
    textAlign: "center",
  },
};

export default function WelcomeEmail(props) {
  const { firstName, lastName, appURL } = props;
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <Html lang="en">
      <Head />
      <Preview>Your Lucy's Circle account is ready.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Img
              alt="Lucy's Circle logo"
              height="160"
              src={LUCY_LOGO_PATH}
              style={styles.logo}
              width="160"
            />
            <Heading style={styles.heading}>Welcome to Lucy's Circle</Heading>
            <Text style={styles.bodyText}>Hi {fullName},</Text>
            <Text style={styles.bodyText}>
              Your Lucy's Circle account is ready. This example fills the first
              and last name as React props, renders the template to HTML, then
              sends that HTML through Postmark.
            </Text>
            <Section style={styles.ctaWrap}>
              <Link href={appURL} style={styles.cta}>
                Open Lucy's Circle
              </Link>
            </Section>
            <Text style={styles.bodyText}>
              If the button does not work, copy and paste this link into your
              browser: {appURL}
            </Text>
          </Section>
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              1825 Haro Street, Vancouver, BC
            </Text>
            <Text style={styles.footerText}>
              Copyright 2026 Lucy's Circle, Inc.
            </Text>
            <Text style={styles.footerText}>All rights reserved</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "Lucy",
  lastName: "Circle",
  appURL: "https://lucyscircle.ca",
};
