import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('hashes a password and can compare it back to true', async () => {
    const hash = await passwordService.hash('correct-password');

    expect(hash).not.toBe('correct-password');
    await expect(
      passwordService.compare('correct-password', hash),
    ).resolves.toBe(true);
  });

  it('compare returns false for a non-matching password', async () => {
    const hash = await passwordService.hash('correct-password');

    await expect(passwordService.compare('wrong-password', hash)).resolves.toBe(
      false,
    );
  });
});
