import { generateRandomEtheriumAddress } from '../../test/testUtils';
import { User, UserRole } from '../entities/user';
import { findAdminUserByEmail } from './userRepository';
import { assert } from 'chai';

describe('findAdminUserByEmail test cases', () => {
  it('should Find admin user by email', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, user.id);
  });

  it('should Find operator user by email', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const user = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, user.id);
  });

  it('should not find operator/admin user when doesnt exists', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    const foundUser = await findAdminUserByEmail(email);
    assert.isNull(foundUser);
  });

  it('should find admin user when there is two user with similar email and restricted one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const adminUser = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });
  it('should find admin user when there is two user with similar email and admin one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;

    const adminUser = await User.create({
      email,
      role: UserRole.ADMIN,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });

  it('should find operator user when there is two user with similar email and restricted one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;
    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const adminUser = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });

  it('should find operator user when there is two user with similar email and operator one created first', async () => {
    const email = `${new Date().getTime()}@giveth.io`;

    const adminUser = await User.create({
      email,
      role: UserRole.OPERATOR,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    await User.create({
      email,
      role: UserRole.RESTRICTED,
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
    }).save();

    const foundUser = await findAdminUserByEmail(email);
    assert.isOk(foundUser);
    assert.equal(foundUser?.id, adminUser.id);
  });
});