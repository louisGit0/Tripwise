export class AuthResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
    displayName: string | null;
    locale: string;
    provider: string;
  };
}
