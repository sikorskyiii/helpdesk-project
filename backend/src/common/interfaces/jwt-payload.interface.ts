export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  email: string;
}
