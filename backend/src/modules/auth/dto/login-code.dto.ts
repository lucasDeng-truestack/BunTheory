import { IsEmail, Matches, MaxLength } from 'class-validator';

/** POST /auth/login/code: email a staff member a 6-digit sign-in code. */
export class LoginCodeRequestDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

/** POST /auth/login/code/verify: trade the emailed code for a staff session. */
export class LoginCodeVerifyDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' })
  code: string;
}
