import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}
