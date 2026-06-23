import {
  Html,
  Body,
  Head,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface VerificationEmailProps {
  title: string;
  body: string;
  buttonText: string;
  footer: string;
  confirmationLink: string;
}

export default function VerificationEmail({
  title,
  body,
  buttonText,
  footer,
  confirmationLink,
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: '#ffffff',
          padding: '40px 20px',
          fontFamily: 'sans-serif',
        }}
      >
        <Container
          style={{
            maxWidth: '500px',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '32px',
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

          <Text
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#09090b',
              margin: '0 0 12px',
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#71717a',
              lineHeight: '24px',
              margin: '0 0 32px',
            }}
          >
            {body}
          </Text>

          <Button
            href={confirmationLink}
            style={{
              backgroundColor: '#18181b',
              color: '#fafafa',
              padding: '12px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {buttonText}
          </Button>

          <Hr style={{ borderColor: '#e4e4e7', margin: '32px 0 16px' }} />
          <Text
            style={{
              fontSize: '12px',
              color: '#a1a1aa',
              lineHeight: '18px',
              margin: 0,
            }}
          >
            {footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
