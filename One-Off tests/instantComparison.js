const config = require('../truffle-config.js');
const RPCurl = 'http://'+config.networks.development.host+":"+config.networks.development.port;
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");
const web3 = new Web3(RPCurl);

console.log(web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[63,false])));