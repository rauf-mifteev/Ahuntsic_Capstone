jest.mock('mongoose', () => ({
  set: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  connection: { on: jest.fn() },
}));

const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');

describe('connectDatabase', () => {
  it('appelle mongoose.connect avec la chaîne de connexion configurée', async () => {
    await connectDatabase();

    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ serverSelectionTimeoutMS: expect.any(Number) })
    );
  });

  it("s'abonne à l'événement 'disconnected' pour pouvoir le journaliser", async () => {
    await connectDatabase();

    expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
  });
});

describe('disconnectDatabase', () => {
  it('appelle mongoose.disconnect', async () => {
    await disconnectDatabase();
    expect(mongoose.disconnect).toHaveBeenCalledTimes(1);
  });
});
