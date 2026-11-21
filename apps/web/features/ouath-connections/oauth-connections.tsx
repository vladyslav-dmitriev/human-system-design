interface OAuthProps {
  initialProviders: {
    google: boolean;
    github: boolean;
  };
}

/**
 * Привязка Google/GitHub скрыта до реализации на API: раньше «привязка»
 * была имитацией (setTimeout) и показывала успех без запроса.
 */
export function OAuthConnections(props: OAuthProps) {
  void props;
  return null;
}
