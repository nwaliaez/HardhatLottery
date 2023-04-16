const { run } = require('hardhat');
const verify = async (contractAddres, args) => {
    console.log('Verify contract...');
    try {
        await run('verify:verify', {
            address: contractAddres,
            constructorArguments: args,
        });
    } catch (e) {
        console.log(e);
    }
};

module.exports = { verify };
