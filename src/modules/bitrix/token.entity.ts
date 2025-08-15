import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  portal!: string; // ví dụ nguyenthuan.bitrix24.vn

  // AUTH_ID hiện tại
  @Column({ type: 'text', nullable: true })
  authId?: string;

  // REFRESH_ID
  @Column({ type: 'text', nullable: true })
  refreshId?: string;

  // Thời gian hết hạn AUTH_ID, epoch ms
  @Column({ type: 'bigint', nullable: true })
  expiresAt?: number;

  // Nếu cài qua OAuth 2.0 (Bitrix24 global)
  @Column({ type: 'text', nullable: true })
  accessToken?: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'bigint', nullable: true })
  oauthExpiresAt?: number;
}
