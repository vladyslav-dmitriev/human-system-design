import {
  Html,
  Body,
  Head,
  Heading,
  Text,
  Container,
  Hr,
  Section,
  Button,
  Row,
  Column,
} from '@react-email/components';

type InvoiceEmailProps = {
  title: string;
  amountText: string;
  viewLinkText: string;
  thankYouText: string;
  pdfUrl: string;
};

export default function InvoiceEmail({
  title,
  amountText,
  viewLinkText,
  thankYouText,
  pdfUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: '"Inter", -apple-system, sans-serif',
          backgroundColor: '#f9fafb',
          padding: '40px 0',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '40px',
          }}
        >
          <Section style={{ marginBottom: '32px' }}>
            <Row>
              <Column
                style={{
                  backgroundColor: '#09090b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  ≡
                </Text>
              </Column>
              <Column style={{ paddingLeft: '10px' }}>
                <Text
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#09090b',
                    margin: 0,
                  }}
                >
                  Task
                  <span style={{ color: '#71717a', fontWeight: '500' }}>
                    Flow
                  </span>
                </Text>
              </Column>
            </Row>
          </Section>

          <Heading
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 16px',
            }}
          >
            {title}
          </Heading>

          <Text
            style={{
              fontSize: '16px',
              color: '#374151',
              lineHeight: '24px',
              margin: '0 0 24px',
            }}
          >
            {amountText}
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={pdfUrl}
              style={{
                backgroundColor: '#000000',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                padding: '12px 24px',
                display: 'inline-block',
              }}
            >
              {viewLinkText}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '20px',
              margin: '0',
            }}
          >
            {thankYouText}
          </Text>
        </Container>

        <Text
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '32px',
          }}
        >
          © 2026 TaskFlow. All rights reserved.
        </Text>
      </Body>
    </Html>
  );
}
