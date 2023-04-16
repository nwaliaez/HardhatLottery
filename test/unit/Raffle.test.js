const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { devChains, networkConfig } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');
!devChains.includes(network.name)
    ? describe.skip
    : describe('Raffle unit test', () => {
          let raffle,
              vrfCoordinatorV2Mock,
              raffleEntranceFee,
              deployer,
              interval;
          raffleEntranceFee = ethers.utils.parseEther('0.1');
          const chainId = network.config.chainId;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture('all');
              raffle = await ethers.getContract('Raffle', deployer);
              vrfCoordinatorV2Mock = await ethers.getContract(
                  'VRFCoordinatorV2Mock',
                  deployer
              );
              interval = await raffle.getInterval();
          });
          describe('constructo r', () => {
              it('initializes the raffle correctly', async () => {
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), '0');
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId].interval
                  );
              });
          });

          describe('Enter Raffle', () => {
              it('revert when you dont pay enough', async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      'Raffle__NotEnoughETHEntered'
                  );
              });
              it('records player when they enter', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  const playerFromContract = await raffle.getPlayer(0);
                  assert.equal(playerFromContract, deployer);
              });
              it('emits event on enter', async () => {
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.emit(raffle, 'RaffleEnter');
              });
              it('doesnot allow entrance when raffle is calculating', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  await raffle.performUpkeep([]);
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWith('Raffle__NotOpen');
              });
          });

          describe('CheckUpKeep', () => {
              it("Returns false if people haven't sent any ETH", async () => {
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  );
                  assert(!upkeepNeeded);
              });
              it('Returns false it raffle is not open', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  await raffle.performUpkeep([]);
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(
                      []
                  );
                  assert.equal(raffleState.toString(), '1');
                  assert(!upkeepNeeded);
              });
          });
          describe('performUpKeep', () => {
              it('It can only run if check up keep is true', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  const tx = await raffle.performUpkeep([]);
                  console.log(tx);
                  assert(tx);
              });
              it('reverts when checkupkeep is false', async () => {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      'Raffle__UpkeepNotNeeded'
                  );
              });
              it('updates the raffle state, emits and event, and calls the vrf coordinator', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  const txResponse = await raffle.performUpkeep([]);
                  const txReceipt = await txResponse.wait(1);
                  const reqId = await txReceipt.events[1].args.requestId;
                  const raffleState = await raffle.getRaffleState();
                  console.log(raffleState, '--STATE--');
                  assert(reqId.toNumber() > 0);
                  assert(raffleState.toString() == '1');
              });
          });
          describe('Fulfill Random Words', () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      interval.toNumber() + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
              });
              it('only be called after performUpkeep', async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith('nonexistent request');
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith('nonexistent request');
              });
              it('picks a winner, resets the lottery, and sends the money', async () => {
                  const additionalEntrance = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrance;
                      i++
                  ) {
                      const accountConnectedRaffle = await raffle.connect(
                          accounts[i]
                      );
                      await accountConnectedRaffle.enterRaffle({
                          value: raffleEntranceFee,
                      });
                  }
                  const startingTimeStamp = await raffle.getLastTimeStamp();
                  await new Promise(async (resolve, reject) => {
                      raffle.once('WinnerPicked', async () => {
                          console.log('Winner picked');
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              console.log(recentWinner, '--WINNER--');
                              console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[2].address);
                              console.log(accounts[3].address);
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp =
                                  await raffle.getLastTimeStamp();
                              const numPlayers =
                                  await raffle.getNumberOfPlayers();
                              const winnerEndingBalance =
                                  await accounts[1].getBalance();
                              assert.equal(numPlayers.toString(), '0');
                              assert.equal(raffleState.toString(), '0');
                              assert(
                                  endingTimeStamp.toNumber() >
                                      startingTimeStamp.toNumber()
                              );
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrance)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              );
                          } catch (error) {
                              reject(error);
                          }
                          resolve();
                      });
                      const tx = await raffle.performUpkeep([]);
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance =
                          await accounts[1].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
          //   describe("",()=>{})
      });
