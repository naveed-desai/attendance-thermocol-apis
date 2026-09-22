import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}
