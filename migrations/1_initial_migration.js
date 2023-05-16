var Battleships = artifacts.require("Battleships");

module.exports = function(deployer) {
  deployer.deploy(Battleships);
};
