const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { devChains, networkConfig } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');
const { resolve, resolveCaa } = require('dns');
const { rejects } = require('assert');
devChains.includes(network.name)
    ? describe.skip
    : describe('Raffle unit test', () => {
          let raffle, raffleEntranceFee, deployer;
          raffleEntranceFee = ethers.utils.parseEther('0.1');
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              raffle = await ethers.getContract('Raffle', deployer);
          });
          describe('Fulfill Random Words', () => {
              it('works with live chainlink keepers', async () => {
                  console.log('Setting up test...');
                  const startingTimeStamp = await raffle.getLastTimeStamp();
                  const accounts = await ethers.getSigners();
                  console.log('Setting up Listener...');
                  await new Promise(async (resolve, reject) => {
                      raffle.once('WinnerPicked', async () => {
                          console.log('WinnerPicked event fired!');
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance =
                                  await accounts[0].getBalance();
                              const endingTimeStamp =
                                  await raffle.getLastTimeStamp();
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address
                              );
                              assert.equal(raffleState.toString(), '0');
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(raffleEntranceFee)
                                      .toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(error);
                          }
                      });
                      console.log('Entering Raffle...');
                      const tx = await raffle.enterRaffle({
                          value: raffleEntranceFee,
                      });
                      await tx.wait(1);
                      console.log('Ok, time to wait...');
                      const winnerStartingBalance =
                          await accounts[0].getBalance();
                  });
              });
          });
      });
