const { ethers } = require('hardhat');

const networkConfig = {
    11155111: {
        name: 'sepolia',
        vrfCoordinatorV2: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
        entranceFee: ethers.utils.parseEther('0.01'),
        gasLane:
            '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
        subscriptionId: '1099',
        callbackGasLimit: '500000',
        interval: '30',
    },
    31337: {
        name: 'hardhat',
        entranceFee: ethers.utils.parseEther('0.01'),
        gasLane:
            '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
        callbackGasLimit: '500000',
        interval: '30',
    },
};

const devChains = ['hardhat', 'localhost'];

module.exports = { networkConfig, devChains };
