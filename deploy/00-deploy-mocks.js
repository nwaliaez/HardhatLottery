const { network, ethers } = require('hardhat');
const { devChains } = require('../helper-hardhat-config');

const BASE_FEE = ethers.utils.parseEther('0.25');
const GAS_PRICE_LINK = 1e9;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (devChains.includes(network.name)) {
        log('Local network, Deploying mocks....');
        await deploy('VRFCoordinatorV2Mock', {
            from: deployer,
            args: args,
            log: true,
        });
        log('Mocks Deployed......');
        log('------------------------------------------');
    }
};

module.exports.tags = ['all', 'mocks'];
