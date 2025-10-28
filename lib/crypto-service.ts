
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const cryptoService = {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
};
