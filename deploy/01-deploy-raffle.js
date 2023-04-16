const { network, ethers, getChainId } = require('hardhat');
const { devChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther('2');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

    if (devChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock');
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse =
            await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = await transactionReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        vrfCoordinatorV2Address = networkConfig[11155111].vrfCoordinatorV2;
        subscriptionId = networkConfig[11155111].subscriptionId;
    }
    const entranceFee = networkConfig[chainId]['entranceFee'];
    const gasLane = networkConfig[chainId]['gasLane'];
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
    const interval = networkConfig[chainId].interval;
    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ];

    const raffle = await deploy('Raffle', {
        from: deployer,
        args,
        log: true,
        waitForConfirmations: network.config.blockConfirmations || 6,
    });
    if (devChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    }
    if (!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log('Verifying...');
        log(args);
        await verify(raffle.address, args);
    }
    log('---------------------------------------');
};

module.exports.tags = ['all', 'raffle'];
