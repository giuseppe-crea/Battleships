var Battleships = artifacts.require("Battleships");
var Merkle = artifacts.require("Merkle");

module.exports = async function(deployer) {
  await deployer.deploy(Merkle);
  await deployer.link(Merkle, Battleships);
  await deployer.deploy(Battleships);
};
